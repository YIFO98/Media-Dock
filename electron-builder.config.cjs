const signedRelease = process.env.MEDIA_DOCK_SIGNED_RELEASE === '1'

if (process.platform !== 'darwin') {
  throw new Error('Media Dock builds require macOS.')
}

const appleSigningConfigured = Boolean(process.env.CSC_NAME || process.env.CSC_LINK)
const appleNotarizationConfigured = Boolean(
  (process.env.APPLE_API_KEY && process.env.APPLE_API_KEY_ID && process.env.APPLE_API_ISSUER)
  || (process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD && process.env.APPLE_TEAM_ID)
  || (process.env.APPLE_KEYCHAIN && process.env.APPLE_KEYCHAIN_PROFILE),
)

if (!signedRelease && (appleSigningConfigured || appleNotarizationConfigured)) {
  throw new Error('Signing credentials are present, but MEDIA_DOCK_SIGNED_RELEASE=1 was not set.')
}

if (signedRelease && (!appleSigningConfigured || !appleNotarizationConfigured)) {
  throw new Error('A signed macOS release requires a Developer ID identity and notarization credentials.')
}

const previewLabel = signedRelease ? '' : '-Unsigned-Developer-Preview'

module.exports = {
  appId: 'com.yifo.mediadock',
  productName: 'Media Dock',
  copyright: 'Copyright © 2026 Yifo',
  asar: true,
  npmRebuild: false,
  directories: {
    output: 'release',
    buildResources: 'build',
  },
  files: [
    'dist/**',
    'dist-electron/**',
    'electron/preload.cjs',
    'electron/v3/preloadApi.cjs',
    'package.json',
  ],
  extraResources: [
    {
      from: 'tools',
      to: 'tools',
      filter: ['**/*'],
    },
    {
      from: 'build/icon.png',
      to: 'icon.png',
    },
  ],
  mac: {
    icon: 'build/icon.icns',
    category: 'public.app-category.video',
    target: 'zip',
    artifactName: `Media-Dock-\${version}${previewLabel}-\${arch}-mac.\${ext}`,
    // Hardened library validation requires a real Developer ID Team ID.
    // Unsigned previews use a complete ad-hoc signature without claiming it.
    hardenedRuntime: signedRelease,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.inherit.plist',
    gatekeeperAssess: false,
    strictVerify: true,
    forceCodeSigning: signedRelease,
    notarize: signedRelease,
    // Apple Silicon still requires a structurally valid signature even when
    // the preview has no Developer ID trust. Let electron-builder own the
    // bundle signature, while preserving the independently verified runtime
    // signatures created by build-mac-share.sh. Re-signing those binaries with
    // hardened-runtime flags prevents FFmpeg from loading its ad-hoc dylibs.
    ...(signedRelease ? {} : {
      identity: '-',
      signIgnore: '/Contents/Resources/tools/',
    }),
  },
}
