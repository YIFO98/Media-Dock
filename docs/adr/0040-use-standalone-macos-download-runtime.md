---
status: accepted
---

# Use the standalone macOS download runtime and check health separately from version

The generic `yt-dlp` release asset is a Python zipapp. A version probe in a development shell can succeed while the same file fails under Finder's environment because a different Python is selected. Media Dock therefore installs and packages the official `yt-dlp_macos` standalone asset, retaining its bundled Python and modules. No system, Homebrew or Conda Python is installed or upgraded by this workflow.

Runtime status and update checks test whether the selected yt-dlp and Deno executables actually run. A Python-based yt-dlp distribution, missing executable, failed version probe or inconsistent recorded version requires repair even when the release version is already current. Repair still requires trusted official release metadata, size/checksum validation, a native executable check and a successful version probe. A mirror only relays the public asset.

Each installation has its own immutable directory, including repeated installations of one release version. Activation remains atomic and keeps the previous executable for rollback; existing task plans retain their pinned tools until the application restarts. Collection inspection uses the application's current managed tools instead of independently discovering an older system copy. Health checks are cancelled and awaited during application shutdown.

Recovery messages follow evidence: an unsupported Python error is a runtime problem with a repair-tools action; explicit Cookie rejection is an authentication problem with an update-Cookies action; an unavailable login-check network request offers retry. A generic HTTP error is not evidence of expired Cookies. Recognized failures replace the ambiguous preflight banner and block queue creation until resolved.
