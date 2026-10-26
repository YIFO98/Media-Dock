# Media Dock release guide

Media Dock 3 is maintained for macOS only (Apple Silicon and Intel). Product-version maturity and platform-package trust are reported separately: a stable source release may carry explicitly labeled unsigned preview assets until the platform signing requirements below pass.

## Package shape

- macOS: `Media-Dock-<version>-<arch>-mac.zip`; open the sole root `Media Dock.app`. No command wrapper or second app entry is included.
- Portable state lives in the sibling `Media Dock Data/` directory. A real write probe runs before the UI starts.
- `yt-dlp`, Deno, FFmpeg, FFprobe, and required shared libraries are bundled under application resources.
- No package is manually reconstructed after executable editing, signing, or notarization.

Unsigned artifacts include `Unsigned-Developer-Preview` in the filename. They are internal test assets, not public releases. macOS Gatekeeper may reject unsigned or unnotarized apps.

## Native build commands

```bash
# Native macOS only
npm run dist:mac
```

`npm run dist` and `npm run dist:mac` use the native macOS build script. Use `.github/workflows/macos-package-gate.yml` for repeatable CI builds.

## macOS gate

The native macOS workflow builds with Hardened Runtime and the project entitlements. The final ZIP is checked for bundle identity, runtime inventory, all four version probes, portable writes, and invalid-path failure. A signed release additionally requires:

```text
codesign --verify --deep --strict
spctl --assess --type execute
xcrun stapler validate
```

The final ZIP is created only after the application has been signed and notarized. Nothing inside the app is rewritten afterward.

## Signing

Credential names, CI variables, and the exact trust sequence are documented in [signing-and-native-packaging.md](release/signing-and-native-packaging.md). Credentials never belong in source, package manifests, logs, or release archives.
