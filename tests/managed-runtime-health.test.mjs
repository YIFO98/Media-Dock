import assert from 'node:assert/strict'
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { inspectManagedRuntimeHealth, isMacosStandaloneExecutable, runtimeUpdateAvailability, selectMacosYtDlpAsset } from '../dist-electron/core/managedRuntimeHealth.js'
import { assertRuntimeAvailable, runtimeProblemFromEvidence } from '../dist-electron/v3/runtimeProblems.js'
import { assertAuthenticatedMediaAvailable, authenticationProblemFromEvidence } from '../dist-electron/v3/authenticationProblems.js'

test('macOS updates select the standalone asset and never fall back to the Python zipapp', () => {
  const generic = { name: 'yt-dlp', browser_download_url: 'https://github.com/yt-dlp/yt-dlp/releases/download/2026.10.26/yt-dlp' }
  const native = { name: 'yt-dlp_macos', browser_download_url: generic.browser_download_url + '_macos', size: 42, digest: 'sha256:fixture' }
  assert.deepEqual(selectMacosYtDlpAsset([generic, native]), { name: native.name, url: native.browser_download_url, size: 42, digest: native.digest })
  assert.equal(selectMacosYtDlpAsset([generic]), null)
})

test('a current-version Python zipapp still requires native runtime repair', async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'media-dock-health-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const command = path.join(root, 'yt-dlp')
  writeFileSync(command, '#!/usr/bin/env python3\n')
  assert.equal(isMacosStandaloneExecutable(command), false)
  assert.equal(isMacosStandaloneExecutable(process.execPath), true)
  const health = await inspectManagedRuntimeHealth('yt-dlp', { command, version: '2026.10.26' })
  assert.deepEqual(runtimeUpdateAvailability(health, '2026.10.26'), { updateAvailable: true, repairRequired: true })
  assert.deepEqual(runtimeUpdateAvailability(health, null), { updateAvailable: false, repairRequired: true })
})

test('runtime checks execute Deno even when its recorded version is current', async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'media-dock-deno-health-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const command = path.join(root, 'deno')
  writeFileSync(command, '#!/bin/sh\nexit 1\n')
  chmodSync(command, 0o755)
  const runtime = { command, version: '2.9.8' }
  assert.deepEqual(runtimeUpdateAvailability(await inspectManagedRuntimeHealth('deno', runtime), '2.9.8'), { updateAvailable: true, repairRequired: true })
  writeFileSync(command, '#!/bin/sh\nprintf "deno 2.9.8\\n"\n')
  assert.deepEqual(await inspectManagedRuntimeHealth('deno', runtime), { currentVersion: '2.9.8', repairRequired: false })
  assert.deepEqual(await inspectManagedRuntimeHealth('deno', null), { currentVersion: null, repairRequired: true })
})

test('runtime failures, Cookie expiry and login-check network failures have different recovery actions', () => {
  const error = new Error('ImportError: You are using an unsupported version of Python. Only Python versions 3.11 and above are supported by yt-dlp')
  assert.equal(authenticationProblemFromEvidence(error), null)
  assert.equal(runtimeProblemFromEvidence(error).actions[0].kind, 'repair-runtime')
  assert.throws(() => assertRuntimeAvailable(error), /runtime\.yt-dlp-python-unsupported/)
  assert.equal(runtimeProblemFromEvidence('WARNING: The provided cookies are no longer valid.'), null)
  assert.equal(authenticationProblemFromEvidence('WARNING: The provided cookies are no longer valid.').actions[0].kind, 'update-authentication')
  assert.equal(authenticationProblemFromEvidence('HTTP Error 403'), null)
  assert.throws(() => assertAuthenticatedMediaAvailable('[network.authentication-check-unavailable]'), (error) => {
    assert.match(error.message, /retry later/)
    assert.doesNotMatch(error.message, /refresh MediaCookies/)
    return true
  })
})
