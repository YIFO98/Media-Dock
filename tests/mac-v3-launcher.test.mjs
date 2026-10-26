import assert from 'node:assert/strict'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import test from 'node:test'

const projectRoot = path.resolve(import.meta.dirname, '..')
const launcherScript = path.join(projectRoot, 'scripts', 'launch-mac-v3-preview.sh')
test('the macOS 3.0 preview launcher resolves the project-local Electron runtime in dry-run mode', {
  skip: process.platform !== 'darwin',
}, () => {
  assert.equal(existsSync(launcherScript), true)

  const syntax = spawnSync('/bin/zsh', ['-n', launcherScript], { encoding: 'utf8' })
  assert.equal(syntax.status, 0, syntax.stderr)

  const result = spawnSync('/bin/zsh', [launcherScript], {
    cwd: '/',
    encoding: 'utf8',
    env: {
      ...process.env,
      MEDIA_DOCK_LAUNCHER_DRY_RUN: '1',
      MEDIA_DOCK_SKIP_BUILD: '1',
    },
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  assert.equal(result.status, 0, output)
  assert.match(output, /Media Dock 3 Preview launcher is ready\./u)
  assert.match(output, new RegExp(projectRoot.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'))
  assert.match(output, /node_modules[/\\]\.bin[/\\]electron/u)
})

test('the macOS 3.0 preview launcher rejects an incomplete Electron runtime before declaring readiness', {
  skip: process.platform !== 'darwin',
}, (t) => {
  const fixtureRoot = mkdtempSync(path.join(os.tmpdir(), 'media-dock-launcher-'))
  t.after(() => rmSync(fixtureRoot, { recursive: true, force: true }))

  const fixtureLauncher = path.join(fixtureRoot, 'scripts', 'launch-mac-v3-preview.sh')
  const electronShim = path.join(fixtureRoot, 'node_modules', '.bin', 'electron')
  mkdirSync(path.dirname(fixtureLauncher), { recursive: true })
  mkdirSync(path.dirname(electronShim), { recursive: true })
  mkdirSync(path.join(fixtureRoot, 'node_modules', 'electron'), { recursive: true })
  mkdirSync(path.join(fixtureRoot, 'dist'), { recursive: true })
  mkdirSync(path.join(fixtureRoot, 'dist-electron'), { recursive: true })

  copyFileSync(launcherScript, fixtureLauncher)
  writeFileSync(path.join(fixtureRoot, 'package.json'), '{}\n')
  writeFileSync(path.join(fixtureRoot, 'dist', 'index.html'), '<!doctype html>\n')
  writeFileSync(path.join(fixtureRoot, 'dist-electron', 'main.js'), '')
  writeFileSync(electronShim, '#!/bin/zsh\nexit 0\n')
  chmodSync(electronShim, 0o755)
  for (const command of ['vite', 'tsc']) {
    copyFileSync(electronShim, path.join(fixtureRoot, 'node_modules', '.bin', command))
  }
  writeFileSync(
    path.join(fixtureRoot, 'node_modules', 'electron', 'path.txt'),
    'Electron.app/Contents/MacOS/Electron',
  )

  const result = spawnSync('/bin/zsh', [fixtureLauncher], {
    cwd: '/',
    encoding: 'utf8',
    env: {
      ...process.env,
      MEDIA_DOCK_LAUNCHER_DRY_RUN: '1',
      MEDIA_DOCK_SKIP_BUILD: '1',
    },
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  assert.notEqual(result.status, 0, output)
  assert.match(output, /Electron runtime is incomplete/u)
  assert.match(output, /npm rebuild electron/u)
  assert.doesNotMatch(output, /Media Dock 3 Preview launcher is ready\./u)
})

function createLauncherFixture(t, { dependenciesPresent = false } = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'media dock 启动-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(path.join(root, 'scripts'))
  mkdirSync(path.join(root, 'bin'))
  copyFileSync(launcherScript, path.join(root, 'scripts', 'launch-mac-v3-preview.sh'))
  writeFileSync(path.join(root, 'package.json'), '{}\n')
  writeFileSync(path.join(root, 'package-lock.json'), '{}\n')
  const writeDependencies = () => {
    mkdirSync(path.join(root, 'node_modules', '.bin'), { recursive: true })
    for (const command of ['electron', 'vite', 'tsc']) {
      const file = path.join(root, 'node_modules', '.bin', command)
      writeFileSync(file, '#!/bin/zsh\nprint "fixture Electron started"\n')
      chmodSync(file, 0o755)
    }
  }
  if (dependenciesPresent) writeDependencies()
  const npm = path.join(root, 'bin', 'npm')
  writeFileSync(npm, `#!/bin/zsh
set -eu
print -r -- "$*" >> "$PWD/npm-calls.txt"
if [[ "$FIXTURE_NPM_FAIL" == "$1" ]]; then exit 23; fi
if [[ "$1" == "ci" || "$1" == "rebuild" ]]; then
  mkdir -p node_modules/.bin node_modules/electron/dist
  for command in electron vite tsc; do
    printf '#!/bin/zsh\\nprint "fixture Electron started"\\n' > "node_modules/.bin/$command"
    chmod +x "node_modules/.bin/$command"
  done
  printf 'runtime\\n' > node_modules/electron/path.txt
  cp node_modules/.bin/electron node_modules/electron/dist/runtime
elif [[ "$1" == "run" && "$2" == "build" ]]; then
  mkdir -p dist dist-electron
  touch dist/index.html dist-electron/main.js
fi
`)
  chmodSync(npm, 0o755)
  return {
    root,
    run: (env = {}) => {
      const result = spawnSync('/bin/zsh', [path.join(root, 'scripts', 'launch-mac-v3-preview.sh')], {
        cwd: '/',
        encoding: 'utf8',
        timeout: 10_000,
        env: {
          ...process.env,
          PATH: `${path.join(root, 'bin')}${path.delimiter}${process.env.PATH}`,
          MEDIA_DOCK_LAUNCHER_DRY_RUN: '0',
          MEDIA_DOCK_SKIP_BUILD: '0',
          FIXTURE_NPM_FAIL: '',
          ...env,
        },
      })
      const callsFile = path.join(root, 'npm-calls.txt')
      return { ...result, output: result.stdout + result.stderr, calls: existsSync(callsFile) ? readFileSync(callsFile, 'utf8') : '' }
    },
  }
}

test('a clean macOS checkout restores locked development dependencies then builds and launches', { skip: process.platform !== 'darwin' }, (t) => {
  const fixture = createLauncherFixture(t)
  const result = fixture.run({ NODE_ENV: 'production' })
  assert.equal(result.status, 0, result.output)
  assert.equal(result.calls, 'ci --include=dev --no-audit --no-fund\nrun build\n')
  assert.match(result.output, /fixture Electron started/)
  assert.equal(readFileSync(path.join(fixture.root, 'package-lock.json'), 'utf8'), '{}\n')
  const relaunch = fixture.run()
  assert.equal(relaunch.status, 0, relaunch.output)
  assert.equal(relaunch.calls, result.calls + 'run build\n')
})

test('an incomplete Electron installation repairs the runtime before launching', { skip: process.platform !== 'darwin' }, (t) => {
  const result = createLauncherFixture(t, { dependenciesPresent: true }).run()
  assert.equal(result.status, 0, result.output)
  assert.equal(result.calls, 'rebuild electron --foreground-scripts\nrun build\n')
  assert.match(result.output, /fixture Electron started/)
})

test('native launcher preparation finishes without starting a runtime or leaving a wrapper', (t) => {
  const fixture = createLauncherFixture(t)
  const result = fixture.run({ MEDIA_DOCK_PREPARE_ONLY: '1' })
  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /launcher is ready/)
  assert.doesNotMatch(result.output, /fixture Electron started/)
  assert.equal(result.calls, 'ci --include=dev --no-audit --no-fund\nrun build\n')
})

test('launcher dry-run reports missing dependencies without installing or building', { skip: process.platform !== 'darwin' }, (t) => {
  const result = createLauncherFixture(t).run({ MEDIA_DOCK_LAUNCHER_DRY_RUN: '1' })
  assert.equal(result.status, 1)
  assert.equal(result.calls, '')
  assert.match(result.output, /Project dependencies are missing/)
})

test('launcher refuses to restore dependencies without the project lockfile', { skip: process.platform !== 'darwin' }, (t) => {
  const fixture = createLauncherFixture(t)
  rmSync(path.join(fixture.root, 'package-lock.json'))
  const result = fixture.run()
  assert.equal(result.status, 1)
  assert.equal(result.calls, '')
  assert.match(result.output, /缺少 package-lock.json/)
})

test('simultaneous macOS launchers cannot reinstall dependencies underneath each other', { skip: process.platform !== 'darwin', timeout: 5000 }, async (t) => {
  const fixture = createLauncherFixture(t)
  const lock = path.join(fixture.root, '.media-dock-launcher.lock')
  writeFileSync(lock, '')
  const owner = spawn('/bin/zsh', ['-c', 'zmodload zsh/system; zsystem flock -f lock_fd "$1"; print locked; read -r release', 'lock-owner', lock])
  t.after(() => owner.kill())
  await new Promise((resolve, reject) => {
    owner.stdout.once('data', resolve)
    owner.once('error', reject)
  })
  const result = fixture.run()
  assert.equal(result.status, 1, result.output)
  assert.equal(result.calls, '')
  assert.match(result.output, /另一个启动器正在准备/)
  owner.stdin.end('\n')
  await new Promise((resolve) => owner.once('exit', resolve))
})

for (const failingStep of ['ci', 'rebuild', 'run']) {
  test(`launcher ${failingStep} failure never opens a stale or incomplete app`, { skip: process.platform !== 'darwin' }, (t) => {
    const result = createLauncherFixture(t, { dependenciesPresent: failingStep === 'rebuild' }).run({ FIXTURE_NPM_FAIL: failingStep })
    assert.equal(result.status, 1, result.output)
    assert.match(result.output, /失败/)
    assert.doesNotMatch(result.output, /fixture Electron started|launcher is ready/)
  })
}
