import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'

if (process.platform !== 'darwin') throw new Error('The source launcher requires macOS.')
const repository = path.resolve(import.meta.dirname, '..')
const options = {}
for (let i = 2; i < process.argv.length; i += 2) {
  if (!['--output', '--project'].includes(process.argv[i]) || !process.argv[i + 1]) throw new Error('Use --output <app path> and optional --project <source path>.')
  options[process.argv[i].slice(2)] = path.resolve(process.argv[i + 1])
}
const project = options.project ?? repository
const output = options.output ?? path.join(repository, '..', 'Media Dock.app')
if (!output.endsWith('.app')) throw new Error('The launcher output must be an .app bundle.')
const owner = 'media-dock-source-launcher-v1\n'
const ownerFile = path.join(output, 'Contents/Resources/launcher-owner.txt')
if (existsSync(output) && (!existsSync(ownerFile) || readFileSync(ownerFile, 'utf8') !== owner)) throw new Error('The output already exists and is not a generated Media Dock source launcher.')
if (!existsSync(path.join(project, 'scripts/launch-mac-v3-preview.sh'))) throw new Error('The selected project has no source launcher script.')
const version = JSON.parse(readFileSync(path.join(repository, 'package.json'), 'utf8')).version.split('-')[0]
const temporary = mkdtempSync(path.join(tmpdir(), 'media-dock-native-launcher-'))
mkdirSync(path.dirname(output), { recursive: true })
const staging = mkdtempSync(path.join(path.dirname(output), '.media-dock-launcher-'))
const bundle = path.join(staging, 'Media Dock.app')
const executable = path.join(bundle, 'Contents/MacOS/MediaDockLauncher')
const resources = path.join(bundle, 'Contents/Resources')
const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`${path.basename(command)} failed (${result.signal ?? result.status}).`)
}
try {
  mkdirSync(path.dirname(executable), { recursive: true })
  mkdirSync(resources)
  writeFileSync(path.join(resources, 'launcher-owner.txt'), owner)
  writeFileSync(path.join(resources, 'project-relative-path.txt'), path.relative(path.dirname(output), project) + '\n')
  copyFileSync(path.join(repository, 'build/icon.icns'), path.join(resources, 'icon.icns'))
  writeFileSync(path.join(bundle, 'Contents/Info.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>com.yifo.mediadock.source-launcher</string>
<key>CFBundleName</key><string>Media Dock</string>
<key>CFBundleDisplayName</key><string>Media Dock</string>
<key>CFBundleExecutable</key><string>MediaDockLauncher</string>
<key>CFBundleIconFile</key><string>icon.icns</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleVersion</key><string>${version}</string>
<key>CFBundleShortVersionString</key><string>${version}</string>
<key>LSMinimumSystemVersion</key><string>12.0</string>
<key>LSUIElement</key><true/>
</dict></plist>\n`)
  run('/usr/bin/swiftc', ['-target', `${process.arch === 'arm64' ? 'arm64' : 'x86_64'}-apple-macosx12.0`, '-module-cache-path', path.join(temporary, 'module-cache'), path.join(repository, 'scripts/mac-source-launcher.swift'), '-o', executable])
  run('/usr/bin/codesign', ['--force', '--sign', '-', bundle])
  run('/usr/bin/codesign', ['--verify', '--deep', '--strict', bundle])
  const previous = path.join(staging, 'previous.app')
  if (existsSync(output)) renameSync(output, previous)
  try { renameSync(bundle, output) }
  catch (error) {
    if (existsSync(previous)) renameSync(previous, output)
    throw error
  }
  console.log(`Native source launcher ready: ${output}`)
} finally {
  rmSync(temporary, { recursive: true, force: true })
  rmSync(staging, { recursive: true, force: true })
}
