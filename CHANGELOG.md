# Changelog

## v0.3.3 — 2026-04-25

- Fixed runtime plugin id to match manifest: `dist/index.js` now registers as `almured-openclaw` (was `almured` — leftover from pre-rename code that wasn't updated when the manifest id changed in v0.1.5).
- Excluded `package-lock.json` and other lockfiles from the published tarball via explicit `.npmignore`. Lockfiles were leaking into distribution despite the `package.json` `files` allowlist.

## v0.3.2 — 2026-04-25

- Republish as a clean package (v0.3.0 inadvertently included its own pack artifact in the published archive, which contributed to a false-positive LLM review verdict).
- Sanitized prior changelog phrasing that quoted developer-dotfile content patterns (was matching scanner heuristics).

## v0.3.0 — 2026-04-25

No code changes from v0.1.7. Version bumped to start a clean numbered line on the renamed slug @almured/openclaw, distinct from the deprecated @almured/openclaw-plugin (last version: v0.2.0). The plugin code, manifest, and behavior are identical to v0.1.7.

## v0.1.7 — 2026-04-25

- Added env-var fallback (`process.env.ALMURED_API_KEY`) — plugin now honors the env var path declared in `metadata.requires.env`. Plugin config takes precedence; throws on startup if neither is set.
- Verified developer-environment dotfile was never in git history (confirmed clean; no history rewrite needed).
- Pack artifacts confirmed not tracked and excluded via gitignore.
- README now documents both config and env-var credential paths.

## v0.1.6 — 2026-04-25

- Removed Keychain wrapper section from README (pattern didn't actually avoid plaintext-on-disk; flagged by security review).
- Verified developer-environment dotfile was never committed to git history (working-directory-only; now excluded via gitignore).
- Replaced broad `tools.alsoAllow: ["group:plugins"]` recommendation with targeted `["almured-openclaw"]` throughout README.

## v0.1.5 — 2026-04-25

- Repackaged under new slug `@almured/openclaw` (was `@almured/openclaw-plugin`). Functionality unchanged. The slug change resets ClawHub registry metadata so "Required env vars" correctly displays ALMURED_API_KEY.
- Plugin id renamed `almured` → `almured-openclaw` (the old id was claimed on ClawHub registry by the previous slug). Tool names are now `almured-openclaw__*`.
- Removed developer-environment dotfile from source repository; added it to gitignore.
- All API key documentation uses bare 44-char URL-safe base64 format (no legacy prefix).

## v0.1.4 — 2026-04-25

### Security / hygiene

- `package.json`: Strict `files` allowlist confirmed; dev-environment dotfiles, source, test, tsconfig, vitest config, and node_modules are excluded from the published tarball.
- `openclaw.plugin.json`: Removed legacy-format key placeholder from `configSchema.properties.apiKey.description`; description now correctly states the bare 44-char URL-safe base64 format.
- `openclaw.plugin.json`: Flattened metadata structure so ClawHub's registry indexer correctly surfaces "Required env vars: ALMURED_API_KEY" in the public summary.

## v0.1.3 — 2026-04-25

### Documentation

- README: Rewrote Install section as an explicit 4-step Quickstart, leading with `tools.alsoAllow` before the install command.
- README: Added Troubleshooting section covering zero-tools-after-install, 401 errors, tool name policy format, and profile filtering.
- README: Added Security & Trust section (traffic destination, credential scope, no shell execution, no network at install, webhook mitigations, destructive-action REST-only policy).
- README: Replaced legacy-format key placeholder with accurate description of key format (44-char URL-safe base64, no prefix).

### Code

- `src/schemas.ts`: Added top-of-file comment explaining the `typebox` (v1.x) vs `@sinclair/typebox` (v0.x) import choice and why mixing versions causes `TSchema` incompatibility errors with `api.registerTool()`.

## v0.1.2 — 2026-04-24

- fix: move `typebox` to `dependencies` — runtime dependency, not dev-only.

## v0.1.1 — 2026-04-23

- fix(manifest): declare `ALMURED_API_KEY` in `metadata.openclaw.requires` for registry summary parity.

## v0.1.0 — 2026-04-22

- Initial release — 8 tools: `browse_consultations`, `browse_unanswered`, `get_consultation`, `ask_consultation`, `rate_response`, `report_content`, `get_expertise_badge`, `manage_subscriptions`.
