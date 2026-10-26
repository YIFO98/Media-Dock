import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import test from 'node:test'

const require = createRequire(import.meta.url)

test('native application restart reopens the same workspace after database and IPC cleanup', { timeout: 45000 }, async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'media dock 重启-'))
  const child = spawn(require('electron'), [path.join(import.meta.dirname, 'fixtures/application-restart-app.cjs')], {
    env: { ...process.env, MEDIA_DOCK_RESTART_TEST_ROOT: root },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', (chunk) => { output += chunk })
  child.stderr.on('data', (chunk) => { output += chunk })
  let report = null
  try {
    const deadline = Date.now() + 40000
    while (Date.now() < deadline) {
      try { report = JSON.parse(readFileSync(path.join(root, 'restart-result.json'), 'utf8')) } catch { /* Starting or writing. */ }
      if (report?.error || report?.reopened || child.signalCode || (child.exitCode !== null && (child.exitCode !== 0 || !report?.cancelVerified))) break
      await delay(100)
    }
    assert.equal(report?.error, undefined, report?.error)
    assert.equal(report?.cancelVerified, true, `Cancellation did not finish; exit=${child.exitCode}; signal=${child.signalCode}; ${output}`)
    assert.equal(report?.cleanupVerified, true, 'The old instance did not finish cleanup')
    assert.equal(report?.reopened, true, 'A second native instance did not open the saved workspace')
    assert.equal(report.launches.length, 2)
  } finally {
    // Only the isolated test instances are eligible for cleanup.
    await delay(300)
    for (const { pid } of report?.launches ?? []) {
      try { process.kill(pid, 'SIGTERM') } catch { /* Already exited. */ }
    }
    if (child.exitCode === null && child.signalCode === null) child.kill()
    rmSync(root, { recursive: true, force: true })
  }
})
