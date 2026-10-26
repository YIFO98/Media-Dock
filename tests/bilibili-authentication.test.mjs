import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createBilibiliAuthenticationVerifier } from '../dist-electron/v3/bilibiliAuthentication.js'
import { authenticationProblemFromEvidence } from '../dist-electron/v3/authenticationProblems.js'

function cookieFile(t, rows = ['.bilibili.com\tTRUE\t/\tTRUE\t4102444800\tSESSDATA\tsynthetic-session']) {
  const root = mkdtempSync(path.join(tmpdir(), 'media-dock-login-test-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const file = path.join(root, 'cookies.txt')
  writeFileSync(file, '# Netscape HTTP Cookie File\n' + rows.join('\n') + '\n')
  return file
}

test('Bilibili checks use only Cookie scopes valid for its fixed HTTPS login endpoint and never rewrite the file', async (t) => {
  const file = cookieFile(t, [
    '#HttpOnly_.bilibili.com\tTRUE\t/\tTRUE\t4102444800\tSESSDATA\tsynthetic-session',
    '.biligame.com\tTRUE\t/\tTRUE\t4102444800\tSESSDATA\tunrelated-account',
    'www.bilibili.com\tFALSE\t/\tTRUE\t4102444800\tPRIVATE\tunrelated-host',
    '.bilibili.com\tTRUE\t/private\tTRUE\t4102444800\tPRIVATE\tunrelated-path',
    '.bilibili.com\tTRUE\t/\tTRUE\t1\tOLD\texpired',
  ])
  const original = readFileSync(file)
  const verify = createBilibiliAuthenticationVerifier(async (url, init) => {
    assert.equal(url, 'https://api.bilibili.com/x/web-interface/nav')
    assert.equal(init.headers.Cookie, 'SESSDATA=synthetic-session')
    assert.equal(init.redirect, 'error')
    assert.ok(init.signal instanceof AbortSignal)
    return Response.json({ code: 0, data: { isLogin: true, vip: { status: 0 } } })
  })
  // No paid membership is not the same as an invalid login.
  await verify('https://www.bilibili.com/video/example', file)
  assert.deepEqual(readFileSync(file), original)
})

for (const [rows, code] of [
  [['.biligame.com\tTRUE\t/\tTRUE\t4102444800\tSESSDATA\tother-domain'], 'authentication.login-required'],
  [['.bilibili.com\tTRUE\t/\tTRUE\t1\tSESSDATA\told'], 'authentication.cookies-expired'],
  [['.bilibili.com\tTRUE\t/\tTRUE\t4102444800\tbili_jct\tcsrf-only'], 'authentication.login-required'],
]) {
  test(`local missing or expired Bilibili credentials fail as ${code} without contacting the server`, async (t) => {
    const file = cookieFile(t, rows)
    const verify = createBilibiliAuthenticationVerifier(async () => { assert.fail('unexpected network request') })
    await assert.rejects(verify('https://www.bilibili.com/video/example', file), (error) => authenticationProblemFromEvidence(error)?.code === code)
  })
}

for (const [payload, code] of [
  [{ code: -101 }, 'authentication.cookies-expired'],
  [{ code: 0, data: { isLogin: false } }, 'authentication.cookies-expired'],
  [{ code: -352 }, 'network.authentication-check-unavailable'],
  [{ code: 0, data: {} }, 'network.authentication-check-unavailable'],
  [null, 'network.authentication-check-unavailable'],
]) {
  test(`server response ${JSON.stringify(payload)} is classified as ${code}`, async (t) => {
    const verify = createBilibiliAuthenticationVerifier(async () => Response.json(payload))
    await assert.rejects(verify('https://www.bilibili.com/video/example', cookieFile(t)), (error) => authenticationProblemFromEvidence(error)?.code === code)
  })
}

test('network failures never label a Cookie expired or expose its contents', async (t) => {
  const verify = createBilibiliAuthenticationVerifier(async () => { throw new Error('sensitive provider details') })
  await assert.rejects(verify('https://www.bilibili.com/video/example', cookieFile(t)), (error) => {
    assert.equal(authenticationProblemFromEvidence(error)?.category, 'network')
    assert.doesNotMatch(error.message, /synthetic-session|sensitive provider/)
    return true
  })
})

test('guest downloads and other sites do not trigger a Bilibili login request', async () => {
  const verify = createBilibiliAuthenticationVerifier(async () => { assert.fail('unexpected network request') })
  await verify('https://www.bilibili.com/video/example', null)
  await verify('https://www.youtube.com/watch?v=example', '/unused')
})
