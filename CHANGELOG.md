# Changelog

## [0.1.6] — 2026-04-25

- Removed Keychain wrapper section from README (pattern didn't actually avoid plaintext-on-disk; flagged by security review as putting key in process env or temp files).
- Verified `.claude/` was never committed to git history (confirmed clean via `git rev-list --all --objects`; it was working-directory-only and is now in `.gitignore`).
- Replaced broad `tools.alsoAllow: ["group:plugins"]` recommendation with targeted `["almured-openclaw"]` throughout README.

## [0.1.5] — 2026-04-25

- REPACKAGED under new slug `@almured/openclaw` (was `@almured/openclaw-plugin`). Functionality unchanged. The slug change resets ClawHub registry metadata so "Required env vars" correctly displays ALMURED_API_KEY (the previous slug had this field locked to "none" from initial publish).
- Plugin id renamed `almured` → `almured-openclaw` (the old id was claimed on ClawHub registry by the previous slug). Tool names are now `almured-openclaw__*` (e.g. `almured-openclaw__browse_consultations`).
- Removed `.claude/` developer artifact from source repository; added `.claude/` to `.gitignore`.
- All API key documentation uses bare 44-char URL-safe base64 format (no legacy prefix).

## [0.1.4] — 2026-04-25

### Security / hygiene

- `package.json`: Strict `files` allowlist now includes `CHANGELOG.md`; `.claude/`, `src/`, `test/`, `tsconfig`, `vitest` config, and `node_modules` are confirmed excluded from the published tarball.
- `openclaw.plugin.json`: Removed legacy-format key placeholder from `configSchema.properties.apiKey.description`; description now correctly states the bare 44-char URL-safe base64 format.
- `openclaw.plugin.json`: Flattened `metadata.openclaw.{requires,primaryEnv,homepage}` to `metadata.{requires,primaryEnv,homepage}` so ClawHub's registry indexer correctly surfaces "Required env vars: ALMURED_API_KEY" in the public summary.

## [0.1.3] — 2026-04-25

### Documentation

- README: Rewrote Install section as an explicit 4-step Quickstart, leading with `tools.alsoAllow` before the install command so users see the policy requirement before hitting OpenClaw issue #47683.
- README: Added Troubleshooting section covering zero-tools-after-install, 401 errors, tool name policy format, and profile filtering.
- README: Added Security & Trust section (traffic destination, credential scope, no shell execution, no network at install, webhook mitigations, destructive-action REST-only policy).
- README: Added "Recommended: macOS Keychain" subsection under Configure with `security` commands and an honest note about OpenClaw's lack of env var substitution in JSON config.
- README: Replaced legacy-format key placeholder with accurate description of key format (44-char URL-safe base64, no prefix).

### Code

- `src/schemas.ts`: Added top-of-file comment explaining the `typebox` (v1.x) vs `@sinclair/typebox` (v0.x) import choice and why mixing versions causes `TSchema` incompatibility errors with `api.registerTool()`.

## [0.1.2] — 2026-04-24

- fix: move `typebox` to `dependencies` — runtime dependency, not dev-only.

## [0.1.1] — 2026-04-23

- fix(manifest): declare `ALMURED_API_KEY` in `metadata.openclaw.requires` for registry summary parity.

## [0.1.0] — 2026-04-22

- Initial release — 8 tools: `browse_consultations`, `browse_unanswered`, `get_consultation`, `ask_consultation`, `rate_response`, `report_content`, `get_expertise_badge`, `manage_subscriptions`.
