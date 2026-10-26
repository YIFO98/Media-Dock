import { readFile } from 'node:fs/promises'
import type { RuntimeFetch } from '../core/runtimeNetwork.js'

export type NetworkAuthenticationVerifier = (
  sourceUrl: string, cookiePath: string | null, signal?: AbortSignal,
) => Promise<void>

const LOGIN_URL = 'https://api.bilibili.com/x/web-interface/nav'
const unavailable = () => new Error('[network.authentication-check-unavailable] 暂时无法确认 B 站登录状态，请检查网络后重试。')

export function createBilibiliAuthenticationVerifier(fetchImpl: RuntimeFetch): NetworkAuthenticationVerifier {
  return async (sourceUrl, cookiePath, signal) => {
    const sourceHost = new URL(sourceUrl).hostname.toLowerCase()
    if (!cookiePath || (sourceHost !== 'bilibili.com' && !sourceHost.endsWith('.bilibili.com') && sourceHost !== 'b23.tv')) return
    const content = await readFile(cookiePath, 'utf8')
    const now = Date.now() / 1_000
    const requestUrl = new URL(LOGIN_URL)
    const cookies = content.split(/\r?\n/u).flatMap((line) => {
      if (!line || (line.startsWith('#') && !line.startsWith('#HttpOnly_'))) return []
      const fields = line.replace(/^#HttpOnly_/u, '').split('\t')
      if (fields.length !== 7) return []
      const [domain, subdomains, cookiePath, , expiryText, name, value] = fields
      const host = domain.replace(/^\./u, '').toLowerCase()
      if (host !== requestUrl.hostname && !(subdomains === 'TRUE' && requestUrl.hostname.endsWith(`.${host}`))) return []
      if (!cookiePath.startsWith('/') || !(requestUrl.pathname === cookiePath || requestUrl.pathname.startsWith(cookiePath.endsWith('/') ? cookiePath : `${cookiePath}/`))) return []
      const expires = Number(expiryText)
      if (!Number.isFinite(expires) || /[\r\n;]/u.test(name + value) || !name || !value) return []
      return [{ name, value, expires, pathLength: cookiePath.length }]
    })
    const sessions = cookies.filter((cookie) => cookie.name === 'SESSDATA')
    if (sessions.length === 0) throw new Error('[authentication.login-required] 未找到适用于 B 站的登录凭据，请重新导入 MediaCookies。')
    if (!sessions.some((cookie) => cookie.expires === 0 || cookie.expires > now)) {
      throw new Error('[authentication.cookies-expired] B 站登录凭据已过期，请重新导入 MediaCookies。')
    }
    const header = cookies.filter((cookie) => cookie.expires === 0 || cookie.expires > now)
      .sort((left, right) => right.pathLength - left.pathLength)
      .map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')
    let body: { code?: unknown; data?: { isLogin?: unknown } }
    try {
      const response = await fetchImpl(LOGIN_URL, {
        headers: { Cookie: header, Referer: 'https://www.bilibili.com/' },
        redirect: 'error', cache: 'no-store',
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000),
      })
      if (!response.ok) throw unavailable()
      body = await response.json() as typeof body
    } catch {
      signal?.throwIfAborted()
      throw unavailable()
    }
    if (body?.code === 0 && body.data?.isLogin === true) return
    if (body?.code === -101 || (body?.code === 0 && body.data?.isLogin === false)) {
      throw new Error('[authentication.cookies-expired] B 站已不再接受这份登录资料，请重新导入 MediaCookies。')
    }
    throw unavailable()
  }
}
