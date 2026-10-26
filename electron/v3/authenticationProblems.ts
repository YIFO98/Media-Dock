import type { ProblemSnapshot } from './mediaTaskEngine.js'

export function authenticationProblemFromEvidence(
  evidence: unknown,
  stage: 'preparing' | 'acquiring' = 'preparing',
): ProblemSnapshot | null {
  const message = evidence instanceof Error ? evidence.message : String(evidence)
  if (message.includes('network.authentication-check-unavailable')) {
    return Object.freeze({
      code: 'network.authentication-check-unavailable', category: 'network', stage,
      titleKey: 'problem.authenticationCheckUnavailable.title', summaryKey: 'problem.authenticationCheckUnavailable.summary',
      actions: Object.freeze([Object.freeze({ id: 'retry-task', kind: 'retry-task' as const })]),
    })
  }
  const expired = /authentication\.cookies-expired/iu.test(message) || [
    /\b(?:provided\s+)?(?:[a-z0-9_-]+\s+){0,3}cookies?\s+(?:are|is)\s+(?:no longer valid|invalid|expired)\b/iu,
    /\b(?:your\s+)?(?:[a-z0-9_-]+\s+){0,3}cookies?\s+have\s+(?:expired|become invalid)\b/iu,
    /\bfresh cookies?\s+(?:are|is)\s+(?:needed|required)\b/iu,
  ].some((pattern) => pattern.test(message))
  // These are explicit yt-dlp access warnings. An ordinary HTTP 403, missing
  // subtitles, or a title containing "preview" is not evidence of Cookie expiry.
  const previewOnly = /authentication\.preview-only|\bonly (?:the )?preview (?:format is available|will be extracted)\b/iu.test(message)
  const loginRequired = /authentication\.login-required|\bThis video is for premium members only\b|\bThis is a supporter-only video\b|\bYou need to purchase the course\b/iu.test(message)
  if (!expired && !previewOnly && !loginRequired) return null
  const suffix = expired ? 'cookies-expired' : previewOnly ? 'preview-only' : 'login-required'
  const key = expired ? 'authenticationCookiesExpired' : previewOnly ? 'authenticationPreviewOnly' : 'authenticationLoginRequired'
  return Object.freeze({
    code: `authentication.${suffix}`,
    category: 'authentication',
    stage,
    titleKey: `problem.${key}.title`,
    summaryKey: `problem.${key}.summary`,
    actions: Object.freeze([Object.freeze({ id: 'update-authentication', kind: 'update-authentication' as const })]),
  })
}

export function assertAuthenticatedMediaAvailable(evidence: unknown): void {
  const problem = authenticationProblemFromEvidence(evidence)
  if (problem) {
    // IPC preserves the message, so include a stable code without raw tool
    // output, private URLs, file paths, or Cookie values.
    throw new Error(`[${problem.code}] 请确认浏览器能播放完整视频，并重新导入 MediaCookies。Check full-video access and refresh MediaCookies.`)
  }
}
