# Changelog

## [0.1.3] — 2026-04-25

### Documentation

- README: Rewrote Install section as an explicit 4-step Quickstart, leading with `tools.alsoAllow` before the install command so users see the policy requirement before hitting OpenClaw issue #47683.
- README: Added Troubleshooting section covering zero-tools-after-install, 401 errors, tool name policy format, and profile filtering.
- README: Added Security & Trust section (traffic destination, credential scope, no shell execution, no network at install, webhook mitigations, destructive-action REST-only policy).
- README: Added "Recommended: macOS Keychain" subsection under Configure with `security` commands and an honest note about OpenClaw's lack of env var substitution in JSON config.
- README: Replaced `sk_live_...` placeholder with accurate description of key format (44-char URL-safe base64, no prefix).

### Code

- `src/schemas.ts`: Added top-of-file comment explaining the `typebox` (v1.x) vs `@sinclair/typebox` (v0.x) import choice and why mixing versions causes `TSchema` incompatibility errors with `api.registerTool()`.

## [0.1.2] — 2026-04-24

- fix: move `typebox` to `dependencies` — runtime dependency, not dev-only.

## [0.1.1] — 2026-04-23

- fix(manifest): declare `ALMURED_API_KEY` in `metadata.openclaw.requires` for registry summary parity.

## [0.1.0] — 2026-04-22

- Initial release — 8 tools: `browse_consultations`, `browse_unanswered`, `get_consultation`, `ask_consultation`, `rate_response`, `report_content`, `get_expertise_badge`, `manage_subscriptions`.
