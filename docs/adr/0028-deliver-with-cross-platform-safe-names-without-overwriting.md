---
status: accepted
---

# Deliver with cross-platform safe names without overwriting

> Platform scope updated on 2026-10-26 by [ADR 0038](0038-support-macos-only.md): macOS is the sole supported platform. Earlier Windows-specific requirements below are historical; remaining product and safety constraints continue to apply.

Media Dock 3.0 previews a platform-safe Delivery Name as part of every Task Plan and never silently overwrites an existing user file. Network media defaults to a readable title plus stable source identifier, derived local media keeps the original name plus its deliverable role, meaningful Unicode is preserved, and Windows-prohibited characters, reserved device names, trailing spaces or dots, control characters, and full-path limits are handled before execution. The main process validates that the destination is a writable filesystem location, shortening only the title portion when necessary while preserving identity and extension; collisions receive a safe suffix unless the user explicitly authorizes replacement, and a retry may reuse only a verified deliverable already owned by the same task.
