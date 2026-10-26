import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const require = createRequire(import.meta.url)
const build = require('../electron-builder.config.cjs')
const macosWorkflow = readFileSync(
  new URL('../.github/workflows/macos-package-gate.yml', import.meta.url),
  'utf8',
)
const macBuildScript = readFileSync(new URL('../scripts/build-mac-share.sh', import.meta.url), 'utf8')
const macVerifyScript = readFileSync(new URL('../scripts/verify-macos-package.sh', import.meta.url), 'utf8')
const electronMainSource = readFileSync(new URL('../electron/main.ts', import.meta.url), 'utf8')

test('electron-builder owns the macOS application identity and ZIP target', () => {
  assert.equal(build.appId, 'com.yifo.mediadock')
  assert.equal(build.productName, 'Media Dock')
  assert.equal(packageJson.author?.name, 'Yifo')
  assert.match(build.copyright, /Yifo/)
  assert.equal(build.win, undefined)
  assert.equal(build.linux, undefined)
  assert.deepEqual(packageJson.os, ['darwin'])
  assert.deepEqual(packageJson.cpu, ['arm64', 'x64'])
  assert.equal(build.mac.target, 'zip')
  assert.equal(build.mac.hardenedRuntime, false, 'unsigned ad-hoc builds have no Team ID for hardened library validation')
  assert.equal(build.mac.entitlements, 'build/entitlements.mac.plist')
  assert.equal(build.mac.identity, '-', 'unsigned arm64 packages still require a valid ad-hoc bundle signature')
  assert.match(
    build.mac.signIgnore,
    /Contents.*Resources.*tools/u,
    'unsigned managed runtimes keep their independently verified signatures instead of inheriting hardened-runtime flags',
  )
  assert.match(build.mac.artifactName, /Unsigned-Developer-Preview/)
})

test('the macOS candidate is built and verified on a native macOS runner', () => {
  assert.match(macosWorkflow, /build_candidate:[\s\S]*?runs-on:\s*macos-/)
  assert.match(macosWorkflow, /verify-macos-package\.sh/)
  assert.match(macosWorkflow, /APPLE_API_KEY_BASE64/)
  assert.match(macosWorkflow, /MAC_CSC_LINK/)
  assert.match(macosWorkflow, /deno_version:[\s\S]*?default:\s*"2\.9\.5"/u)
  assert.match(macosWorkflow, /DENO_VERSION:\s*\$\{\{ inputs\.deno_version \}\}/u)
  assert.match(macBuildScript, /DENO_VERSION="\$\{DENO_VERSION:-2\.9\.5\}"/u)
  assert.match(
    macosWorkflow,
    /shell:\s*\/bin\/zsh\s+-e\s+\{0\}/u,
    'custom zsh workflow steps must use the GitHub Actions {0} shell template',
  )
  assert.match(
    macosWorkflow,
    /unset CSC_LINK CSC_KEY_PASSWORD APPLE_API_KEY APPLE_API_KEY_ID APPLE_API_ISSUER/u,
    'unsigned workflows must remove empty signing variables before electron-builder resolves CSC_LINK',
  )
  const signatureVerificationIndex = macVerifyScript.indexOf(
    'codesign --verify --deep --strict --verbose=2 "$APP_PATH"',
  )
  const trustedReleaseBranchIndex = macVerifyScript.indexOf('if [[ "$REQUIRE_SIGNED" == "1" ]]')
  assert.ok(signatureVerificationIndex >= 0 && signatureVerificationIndex < trustedReleaseBranchIndex,
    'the final extracted bundle must pass structural code-signature verification even when it is an unsigned preview')
})

test('macOS packages expose exactly one launcher', () => {
  assert.match(macBuildScript, /Launch Media Dock\.command/u)
  assert.match(macBuildScript, /core\/Media Dock\.app/u)
  assert.match(macVerifyScript, /Launch Media Dock\.command/u)
  assert.match(macVerifyScript, /core\/Media Dock\.app/u)
})

test('3.0 startup uses only the v3 Authentication Profile store', () => {
  assert.doesNotMatch(electronMainSource, /importLatestLegacyAuthenticationPackage\(v3TaskEngine, getCookiesDir\(\)\)/u)
})
