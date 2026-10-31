import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { inspectNetworkMediaSource, inspectNetworkVideoQualities } from '../dist-electron/v3/networkMediaSourceAdapter.js'

async function withFakeYtDlp(metadata, run, warning = '') {
  const directory = mkdtempSync(path.join(tmpdir(), 'media-dock-network-adapter-'))
  const fixturePath = path.join(directory, 'fake-yt-dlp.cjs')
  mkdirSync(directory, { recursive: true })
  writeFileSync(fixturePath, `
if (!process.argv.includes('--no-warnings')) process.stderr.write(${JSON.stringify(warning)})
process.stdout.write(${JSON.stringify(JSON.stringify(metadata))})
`)
  try {
    return await run({ command: process.execPath, argsPrefix: [fixturePath], version: 'fixture' })
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

test('Quality Preview estimates the formats selected by yt-dlp instead of the largest same-height candidates', async () => {
  const qualities = await withFakeYtDlp({
    duration: 1_200,
    formats: [
      { format_id: 'audio-large', vcodec: 'none', acodec: 'aac', filesize: 400_000_000 },
      { format_id: 'audio-best', vcodec: 'none', acodec: 'opus', filesize: 200_000_000 },
      { format_id: 'video-large', height: 1080, vcodec: 'avc1', acodec: 'none', filesize: 2_600_000_000 },
      { format_id: 'video-best', height: 1080, vcodec: 'vp9', acodec: 'none', filesize: 1_500_000_000 },
    ],
  }, (ytDlp) => inspectNetworkVideoQualities('https://media.example/watch?v=estimate', ytDlp))

  assert.deepEqual(qualities, [{ height: 1080, estimatedBytes: 1_700_000_000 }])
})

for (const [warning, code] of [
  ['WARNING: Only preview format is available, you have to become a premium member to access full video.', 'authentication.preview-only'],
  ['WARNING: This is a supporter-only video, only the preview will be extracted: 试看', 'authentication.preview-only'],
  ['WARNING: The provided account cookies are no longer valid.', 'authentication.cookies-expired'],
  ['ERROR: This video is for premium members only', 'authentication.login-required'],
]) {
  test(`successful metadata containing access warning becomes ${code}: ${warning}`, async () => {
    await withFakeYtDlp({ id: 'preview', title: 'Fixture video', duration: 60, formats: [{ height: 720, vcodec: 'avc1' }] }, async (ytDlp) => {
      const inspection = await inspectNetworkMediaSource('https://www.bilibili.com/video/BVfixture', ytDlp)
      assert.equal(inspection.status, 'needs-attention')
      assert.equal(inspection.problem.code, code)
      assert.equal(inspection.problem.actions[0].kind, 'update-authentication')
      await assert.rejects(inspectNetworkVideoQualities('https://www.bilibili.com/video/BVfixture', ytDlp), (error) => {
        assert.ok(error.message.includes(code))
        return true
      })
    }, warning)
  })
}

test('subtitle sign-in warnings and preview titles do not block accessible full videos', async () => {
  await withFakeYtDlp({ id: 'trailer', title: 'Only preview format is available — a review', duration: 60 }, async (ytDlp) => {
    const inspection = await inspectNetworkMediaSource('https://www.bilibili.com/video/BVfixture', ytDlp)
    assert.equal(inspection.status, 'ready')
  }, 'WARNING: Subtitles are only available when logged in.')
})

test('unsupported Python becomes a runtime repair problem in inspection and quality preflight', async () => {
  await withFakeYtDlp({ id: 'runtime', title: 'Fixture', duration: 60 }, async (ytDlp) => {
    const inspection = await inspectNetworkMediaSource('https://media.example/watch?v=runtime', ytDlp)
    assert.equal(inspection.status, 'needs-attention')
    assert.equal(inspection.problem.category, 'runtime')
    assert.equal(inspection.problem.actions[0].kind, 'repair-runtime')
    await assert.rejects(inspectNetworkVideoQualities('https://media.example/watch?v=runtime', ytDlp), /runtime\.yt-dlp-python-unsupported/)
  }, 'ImportError: You are using an unsupported version of Python. Only Python versions 3.11 and above are supported by yt-dlp')
})

test('Quality Preview reports an unknown estimate when the selected format has no reliable size metadata', async () => {
  const qualities = await withFakeYtDlp({
    duration: 1_200,
    formats: [
      { format_id: 'audio-known', vcodec: 'none', acodec: 'aac', filesize: 200_000_000 },
      { format_id: 'audio-selected-unknown', vcodec: 'none', acodec: 'opus' },
      { format_id: 'video-known', height: 1080, vcodec: 'avc1', acodec: 'none', filesize: 1_500_000_000 },
      { format_id: 'video-selected-unknown', height: 1080, vcodec: 'vp9', acodec: 'none' },
    ],
  }, (ytDlp) => inspectNetworkVideoQualities('https://media.example/watch?v=unknown-estimate', ytDlp))

  assert.deepEqual(qualities, [{ height: 1080, estimatedBytes: null }])
})
