import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

test('native source entry replaces itself with the runtime and exits without a terminal or Node wrapper', { timeout: 60000 }, async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'media dock 原生入口-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const project = path.join(root, '中文 项目')
  mkdirSync(path.join(project, 'scripts'), { recursive: true })
  mkdirSync(path.join(project, 'node_modules/electron/dist'), { recursive: true })
  writeFileSync(path.join(project, 'scripts/launch-mac-v3-preview.sh'), '#!/bin/zsh\n[[ "$MEDIA_DOCK_PREPARE_ONLY" == "1" ]] || exit 12\nprint "preparation only"\n')
  writeFileSync(path.join(project, 'node_modules/electron/path.txt'), 'runtime\n')
  const runtime = path.join(project, 'node_modules/electron/dist/runtime')
  writeFileSync(runtime, `#!/bin/zsh
[[ "$MEDIA_DOCK_V3_PREVIEW" == "1" ]] || exit 13
[[ ! -t 0 && ! -t 1 && ! -t 2 ]] || exit 14
print -r -- "$$" > "$1/runtime.pid"
print -r -- "$1" > "$1/runtime-project.txt"
print "runtime output must not enter the preparation log"
`)
  chmodSync(runtime, 0o755)
  const bundle = path.join(root, 'Media Dock.app')
  const build = spawnSync(process.execPath, [path.join(import.meta.dirname, '../scripts/build-mac-launcher.mjs'), '--output', bundle, '--project', project], { encoding: 'utf8', timeout: 45000 })
  assert.equal(build.status, 0, build.stdout + build.stderr)
  const child = spawn(path.join(bundle, 'Contents/MacOS/MediaDockLauncher'), [], { stdio: ['ignore', 'pipe', 'pipe'] })
  t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill() })
  let errors = ''
  child.stderr.on('data', (chunk) => { errors += chunk })
  const code = await new Promise((resolve, reject) => {
    child.on('exit', resolve)
    child.on('error', reject)
  })
  assert.equal(code, 0, errors)
  assert.equal(Number(readFileSync(path.join(project, 'runtime.pid'), 'utf8').trim()), child.pid, 'The native entry must exec the runtime, not leave a supervising process')
  assert.equal(readFileSync(path.join(project, 'runtime-project.txt'), 'utf8').trim(), project)
  assert.equal(readFileSync(path.join(project, 'output/launcher/startup.log'), 'utf8'), 'preparation only\n')
  assert.throws(() => process.kill(child.pid, 0), { code: 'ESRCH' })
  assert.equal(existsSync(path.join(bundle, 'Contents/Resources/icon.icns')), true)
})
