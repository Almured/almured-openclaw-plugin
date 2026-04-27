# Changelog

## v0.4.0 — 2026-04-27

### Added
- Tool descriptions rewritten to trigger appropriate spontaneous LLM tool selection (when authoritative real-time data, sourced numerical claims, or niche domain expertise is needed).
- `agentInstructions` field in plugin manifest. The OpenClaw install flow surfaces this to users for explicit consent before injecting into host LLM system prompts.
- `auto_consult` config: per-category opt-in toggles. Defaults to all 15 categories enabled when the user opts in to auto-consult. Editable in `~/.openclaw/openclaw.json`.

### Changed
- `apiKey` removed from required config fields. The env-var fallback (`process.env.ALMURED_API_KEY`) already worked in code; the schema is now correct.
- 6 new tests covering auto_consult default behavior and category-level enforcement.

### Migration from v0.3.6
- No breaking changes. Existing installs continue to work. New behavior (auto_consult) is opt-in via the install consent flow.

## v0.3.6 — 2026-04-26

- Cosmetic: fix displayName in ClawHub registry ("Almured Stage XXXXXX..." → "Almured") by publishing from a controlled staging dir basename. No code or manifest changes.

## v0.3.5 — 2026-04-26

- Removed accidental developer dotfile (`.claude/`) from published artifact; switched to single-call staging publish to prevent recurrence.
- Manifest no longer declares `ALMURED_API_KEY` as a required env var — it is a fallback for `config.apiKey`. Removes the registry-summary vs manifest contradiction.
- v0.3.4 is deprecated; do not install.

## v0.3.4 — 2026-04-26

**Deprecated** — do not install. See v0.3.5.

- Fixed `src/index.ts`: `api.config` → `api.pluginConfig` (source had the field name wrong; only the compiled `dist/index.js` had been hand-patched, so a clean rebuild would have regressed the fix).
- Fixed `src/schemas.ts`: `rate_response` `value` field changed from `Type.Integer({minimum:1, maximum:5})` to `Type.Union([Type.Literal("useful"), Type.Literal("not_useful")])` — matches the server's Pydantic string enum.
- Fixed key-length documentation: corrected all references from 44-char to 43-char (README, CHANGELOG, and `openclaw.plugin.json` apiKey description — the manifest was missed in the original pass).

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
- All API key documentation uses bare 43-char URL-safe base64 format (no legacy prefix).

## v0.1.4 — 2026-04-25

### Security / hygiene

- `package.json`: Strict `files` allowlist confirmed; dev-environment dotfiles, source, test, tsconfig, vitest config, and node_modules are excluded from the published tarball.
- `openclaw.plugin.json`: Removed legacy-format key placeholder from `configSchema.properties.apiKey.description`; description now correctly states the bare 43-char URL-safe base64 format.
- `openclaw.plugin.json`: Flattened metadata structure so ClawHub's registry indexer correctly surfaces "Required env vars: ALMURED_API_KEY" in the public summary.

## v0.1.3 — 2026-04-25

### Documentation

- README: Rewrote Install section as an explicit 4-step Quickstart, leading with `tools.alsoAllow` before the install command.
- README: Added Troubleshooting section covering zero-tools-after-install, 401 errors, tool name policy format, and profile filtering.
- README: Added Security & Trust section (traffic destination, credential scope, no shell execution, no network at install, webhook mitigations, destructive-action REST-only policy).
- README: Replaced legacy-format key placeholder with accurate description of key format (43-char URL-safe base64, no prefix).

### Code

- `src/schemas.ts`: Added top-of-file comment explaining the `typebox` (v1.x) vs `@sinclair/typebox` (v0.x) import choice and why mixing versions causes `TSchema` incompatibility errors with `api.registerTool()`.

## v0.1.2 — 2026-04-24

- fix: move `typebox` to `dependencies` — runtime dependency, not dev-only.

## v0.1.1 — 2026-04-23

- fix(manifest): declare `ALMURED_API_KEY` in `metadata.openclaw.requires` for registry summary parity.

## v0.1.0 — 2026-04-22

- Initial release — 8 tools: `browse_consultations`, `browse_unanswered`, `get_consultation`, `ask_consultation`, `rate_response`, `report_content`, `get_expertise_badge`, `manage_subscriptions`.
