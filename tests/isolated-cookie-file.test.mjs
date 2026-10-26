import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { withIsolatedCookieFile } from '../dist-electron/core/isolatedCookieFile.js'
import { runRuntimeProcessCollectOutput } from '../dist-electron/core/runtimeProcess.js'

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'media-dock-isolation-test-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const source = path.join(root, 'imported.cookies.txt')
  writeFileSync(source, 'synthetic original')
  return source
}

test('concurrent Cookie writers have private snapshots and cannot overwrite the imported original or each other', async (t) => {
  const source = fixture(t)
  const copies = []
  let release
  const ready = new Promise((resolve) => { release = resolve })
  await Promise.all([0, 1, 2].map((index) => withIsolatedCookieFile(source, async (copy) => {
    copies.push(copy)
    assert.equal(readFileSync(copy, 'utf8'), 'synthetic original')
    assert.equal(statSync(copy).mode & 0o777, 0o600)
    assert.equal(statSync(path.dirname(copy)).mode & 0o777, 0o700)
    if (copies.length === 3) release()
    await ready
    await runRuntimeProcessCollectOutput({
      command: process.execPath,
      args: ['-e', `require('node:fs').writeFileSync(process.argv[1], 'writer-${index}')`, copy],
      timeoutMs: 3000, workingDirectory: tmpdir(), env: process.env,
    })
    assert.equal(readFileSync(copy, 'utf8'), `writer-${index}`)
  })))
  assert.equal(new Set(copies).size, 3)
  assert.equal(readFileSync(source, 'utf8'), 'synthetic original')
  for (const copy of copies) assert.equal(existsSync(path.dirname(copy)), false)
})

test('failed operations remove their Cookie copy while guest operations create none', async (t) => {
  const source = fixture(t)
  let temporary
  await assert.rejects(withIsolatedCookieFile(source, async (copy) => {
    temporary = copy
    writeFileSync(copy, 'temporary mutation')
    throw new Error('simulated failure')
  }), /simulated failure/)
  assert.equal(existsSync(path.dirname(temporary)), false)
  assert.equal(readFileSync(source, 'utf8'), 'synthetic original')
  assert.equal(await withIsolatedCookieFile(null, async (copy) => copy), null)
})

test('cancellation waits for a runtime to finish saving its Cookie jar before cleaning up', { timeout: 5000 }, async (t) => {
  const source = fixture(t)
  const controller = new AbortController()
  let temporary
  await assert.rejects(withIsolatedCookieFile(source, async (copy) => {
    temporary = copy
    return await runRuntimeProcessCollectOutput({
      command: process.execPath,
      args: ['-e', `process.on('SIGTERM', () => setTimeout(() => { require('node:fs').writeFileSync(process.argv[1], 'saved on shutdown'); process.exit(0) }, 100)); setInterval(() => {}, 1000); process.stdout.write('ready\\n')`, copy],
      timeoutMs: 3000, workingDirectory: tmpdir(), env: process.env, signal: controller.signal,
      onOutputLine: (line) => { if (line === 'ready') controller.abort() },
    })
  }), { name: 'AbortError' })
  assert.equal(existsSync(path.dirname(temporary)), false)
  assert.equal(readFileSync(source, 'utf8'), 'synthetic original')
})
