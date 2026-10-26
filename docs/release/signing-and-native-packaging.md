# Native packaging and signing

## Non-negotiable order

For macOS the order is: stage final resources → edit application identity and icons → sign every required binary → verify signatures → notarize/staple where applicable → create ZIP → verify the exact ZIP → publish checksums.

No file inside a signed application may be changed after signing. A release ZIP must never be produced by copying or renaming an Electron runtime.

## macOS

A public macOS ZIP requires an Apple Developer Program **Developer ID Application** certificate plus notarization credentials.

GitHub Actions secrets:

- `MAC_CSC_LINK`: base64-encoded Developer ID Application P12.
- `MAC_CSC_KEY_PASSWORD`: P12 password.
- `APPLE_API_KEY_BASE64`: base64-encoded App Store Connect API `.p8` key.
- `APPLE_API_KEY_ID`: API key identifier.
- `APPLE_API_ISSUER`: API issuer identifier.

The build enables Hardened Runtime and uses `build/entitlements.mac.plist` plus `build/entitlements.mac.inherit.plist`. electron-builder signs and notarizes before ZIP creation. The native gate then verifies the signature, Gatekeeper assessment, and notarization staple from the extracted final ZIP.

FFmpeg library references are relocated before application signing so the tools remain portable. This invalidates their prior ad-hoc signatures: unsigned arm64 previews receive new ad-hoc signatures for executability, while a formal release receives the final Developer ID signature through electron-builder.

Apple-ID notarization credentials (`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`) are supported by electron-builder but the API-key flow is preferred for CI.

## Unsigned Developer Preview

When `MEDIA_DOCK_SIGNED_RELEASE` is not `1`, artifacts are named `Unsigned-Developer-Preview`. They can exercise package structure, metadata, portable writes, runtime probes, and application behavior, but they cannot prove platform trust:

- Gatekeeper may block an unsigned/unnotarized `.app` on another Mac.
- Do not describe these packages as universally “unzip and run.”
