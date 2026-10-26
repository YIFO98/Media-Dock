---
status: accepted
---

# Use one native macOS entry

At the maintainer's request, `Media Dock.app` is the only user-facing launch entry from `3.0.4-preview.6`. Remove the local and tracked `.command` launchers and legacy launch aliases. The source app invokes `prepare-mac-app.sh` internally to restore dependencies and build; that script only prepares files and never starts another application.

Future portable ZIPs place the unchanged, electron-builder-owned `Media Dock.app` at the archive root. No `core/` application copy or command wrapper is added. The existing packaged-app data resolver uses the app's parent directory, keeping `Media Dock Data` beside the app without a launch-time environment override. Verification rejects duplicate root apps and command launchers and checks the default data location.

This supersedes the root command launcher and nested app layout in ADR 0034. Signing, notarization, privacy, safe shutdown and final-artifact verification remain required. Existing published archives are historical artifacts and are not rewritten. Development commands and internal build helpers are not additional end-user launch entries.
