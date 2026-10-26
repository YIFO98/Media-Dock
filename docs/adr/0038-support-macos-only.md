---
status: accepted
---

# Support macOS only

As requested by the maintainer on 2026-10-26, Media Dock supports macOS on Apple Silicon and Intel starting with `3.0.4-preview.4`. Application startup and package metadata enforce this boundary. Runtime discovery, process groups, decoding, paths, executable permissions, download assets, packaging, signing, icons and CI follow macOS conventions; Windows build scripts, PowerShell helpers, signing configuration and platform-only tests are removed.

This supersedes the multi-platform scope in ADRs 0012, 0022, 0028, both 0031 records, and the Windows-specific consequences of ADR 0034. Other requirements remain in force: private local authentication data, atomic runtime activation, protected user media, stable task history, explicit restart confirmation, native package verification and honest signing claims.

Current release guides describe macOS only. Older release notes and verification records remain historical evidence; no existing Git history, published release, user media or authentication data is deleted. Third-party dependencies may retain their own platform support in the lockfile, without creating a Media Dock platform target.

Delivery names preserve Unicode and punctuation accepted by macOS. Control characters, slash and colon separators are replaced; empty or directory-only names are rejected or replaced. Existing user files and stored historical delivery names are not renamed.
