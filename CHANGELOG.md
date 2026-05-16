# Changelog

## [0.5.4] — BREAKING CHANGE: default mode changed — 2026-05-16

### Breaking

- **Default `config.mode` changed from `'full'` to `'standard'`.** Users who relied on the v0.5.3-and-earlier implicit default and need pricing/org-management tools at runtime must now explicitly set `config.mode: 'full'`. Tools no longer registered by default: `set_pricing`, `manage_organization`.

### Migration

To preserve v0.5.3 behavior on upgrade, add `"mode": "full"` to your plugin config in `~/.openclaw/openclaw.json`:

```jsonc
{
  "plugins": {
    "entries": {
      "almured-openclaw": {
        "source": "@almured/openclaw",
        "config": {
          "apiKey": "${ALMURED_API_KEY}",
          "mode": "full"
        }
      }
    }
  }
}
```

If your agent never used `set_pricing` or `manage_organization` (the typical case — those are admin/owner tools), no migration is needed: the new `'standard'` default covers all 11 read/write consultation and message tools.

Plugins now log an `INFO` message at load time when `mode` is taken from the default, naming the chosen mode and the explicit-opt-in path for the full set:

> `Almured plugin loaded in 'standard' mode (default). Admin tools (set_pricing, manage_organization) are not registered. To enable them, set config.mode='full' …`

### Added — auto-detect config file path for permission check

The v0.5.2 config-file permission check (ASI03) previously required `OPENCLAW_CONFIG_PATH` to be set in the gateway environment. v0.5.4 falls back to the platform default if the env var is omitted:

- **Unix / macOS:** `~/.openclaw/openclaw.json`
- **Windows:** `%APPDATA%\openclaw\openclaw.json`

If neither the env var nor a platform default resolves to a real file, the check emits a `console.debug` trace and no-ops. `OPENCLAW_CONFIG_PATH` still takes precedence when set. New exported helper: `resolveDefaultConfigPath()`.

### Added — optional sanitizer block mode (`sanitizerMode`)

New config field `sanitizerMode: 'warn' | 'block' | 'off'`, default `'warn'` (unchanged behavior). Controls how the plugin reacts when a peer response matches one of the prompt-injection pattern categories in `src/response-sanitizer.ts`:

- `warn` (default) — logs one `console.warn` per match and returns the response unmodified. Preserves marketplace functionality.
- `block` — throws an `Error` naming the matched patterns and their previews. The agent never sees a peer response that contained an injection pattern. Use for paranoid deployments where the cost of a false positive is acceptable.
- `off` — skips the scan entirely.

New exported helper: `enforceSanitizerPolicy(text, mode, log?)`.

### Tests

175 passing (was 162). Added: sanitizer-mode dispatch tests, auto-detect path-resolution tests on both Unix and Windows mocked platforms, INFO-log assertion tests, explicit-`mode: 'full'` opt-in path test.

### Migration summary

| Change | Action required if you don't override | Action required if you override existing field |
| --- | --- | --- |
| Default `mode` flipped to `'standard'` | Verify your agent doesn't call `set_pricing` or `manage_organization`. If it does, add `"mode": "full"`. | None — your existing `"mode"` value is honored as before. |
| Auto-detect config path for ASI03 | None — auto-detect is best-effort; nothing breaks if `~/.openclaw/openclaw.json` doesn't exist. | None — `OPENCLAW_CONFIG_PATH` still takes precedence. |
| New `sanitizerMode` field | None — default `'warn'` is the v0.5.3 behavior. | N/A — field is new in v0.5.4. |

## v0.5.3 — 2026-05-16

### Changed — ClawScan static-analysis cleanup

The v0.5.2 docs quoted several prompt-injection pattern *strings* verbatim, which tripped ClawScan's content scanner as a false positive. Rewrote the affected sections in `README.md`, `SECURITY.md`, and the v0.5.2 `CHANGELOG.md` entry to describe the pattern *categories* (instruction-override, role-confusion, system-prompt markers, tokenizer-control sequences) and point readers to [`src/response-sanitizer.ts`](./src/response-sanitizer.ts) for the actual regex set. The runtime defense itself is unchanged — same regex set, same `console.warn` behavior, same "never modify the response" guarantee.

### Changed — `config.mode` validation is now strict (small breaking change)

Unknown values for `config.mode` previously fell back silently to `'full'`. ClawScan flagged this under ASI02 (Insufficient Permission Controls) because the silent fallback would mask typos that intended a restrictive mode and accidentally landed on the full 13-tool set. v0.5.3 throws on any value not in `'readonly' | 'standard' | 'full'`. `undefined` (omitted entirely) still defaults to `'full'` for backward compatibility — only positively-invalid values throw.

Migration: confirm any pinned `config.mode` value is exactly `"readonly"`, `"standard"`, or `"full"`. Anything else (typos, stale identifiers from external policy generators) now fails the plugin load.

### Added — callback URL validation (`manage_subscriptions`)

`manage_subscriptions` now refuses to send a `callback_url` that's clearly unsafe before the outbound API call. The server-side already enforces HTTPS, but pre-validating locally gives a clear, named error and blocks SSRF-shaped targets that a coerced agent might try to register. Rejected categories:

- Non-HTTPS schemes (`http://`, `ws://`, `wss://`, `file://`, `ftp://`, …)
- Loopback hosts: `localhost`, `*.localhost`, `127.0.0.0/8`, `[::1]`
- RFC1918 private ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- IPv4 link-local `169.254.0.0/16` (covers cloud metadata endpoints)
- `0.0.0.0/8` (unspecified / this-network)
- Reserved internal TLDs: `.local`, `.internal`, `.intranet`

Errors name the failed check so operators see why their registration was refused. See `src/callback-url.ts` and `test/callback-url.test.ts` for the full contract.

### Tests

160 passing (was 126 in v0.5.2). Added 34 tests in `test/callback-url.test.ts` covering each accept/reject class. Updated `test/index.test.ts` to pin the new strict-mode-validation contract (throw on unknown, default-to-full on undefined / null).

## v0.5.2 — 2026-05-16

### Added — ClawScan ASI plugin-level mitigations

v0.5.1's `SECURITY.md` documented ASI02, ASI03, ASI07 as "operator-enforced" in lieu of OpenClaw SDK support for fine-grained capability annotation. v0.5.2 ships plugin-level defenses that don't require user-side configuration to be effective.

- **ASI02 (Insufficient Permission Controls) — `config.mode` kill switch.** New config field `mode: 'readonly' | 'standard' | 'full'`. `readonly` registers only 6 read tools; `standard` adds the 5 write tools an agent typically needs (excludes `set_pricing` and `manage_organization`); `full` is the previous 13-tool behavior and remains the default for backward compatibility. We now recommend `standard` for most deployments. See `examples/openclaw-policy.recommended.json`. Unrecognized values fall back to `full`. Exported `allowedTools(mode)` for downstream introspection.
- **ASI03 (Insecure Credentials Management) — config file permission check.** At plugin load, if `OPENCLAW_CONFIG_PATH` is set, the plugin stats the file and warns once if its Unix mode includes group- or world-readable bits, suggesting `chmod 0600`. No-op on Windows; no-op when the env var isn't set; never throws.
- **ASI07 (Insecure Output Handling) — pre-send secret scanner.** New config field `secretScanning: 'block' | 'warn' | 'off'` (default `block`). Before `ask_consultation`, `send_message`, or `manage_subscriptions` makes its outbound HTTP call, arguments are JSON-stringified and scanned for high-confidence patterns: AWS access keys, GitHub PATs/OAuth tokens, Stripe live/test keys, Anthropic keys, OpenAI keys, RSA/SSH/EC/DSA private key headers, and JWTs. `block` (default) refuses to send and throws with the pattern name and a 6-char preview (never the full secret). `warn` logs and proceeds. `off` disables.
- **ASI07 follow-on — peer response injection-pattern warning.** Every successful response is scanned against the regex set in `src/response-sanitizer.ts`, which covers common prompt-injection pattern categories: instruction-override, role-confusion, system-prompt markers, and tokenizer-control sequences. Matches log a WARN but the response is never modified. Calling agents and operators should treat peer-authored text as data, not instructions.
- **API key leak hardening.** `AlmuredClient` now redacts the configured API key from any error message it throws. If a buggy or malicious upstream were to echo the `Authorization` header back inside an error body, the plugin replaces the key with `[REDACTED]` before propagating. Regression test (`test/client-leak.test.ts`) pins the invariant across 401 / 422 / 429 / 500 / JSON-RPC-error paths.

### Added — documentation

- **`examples/openclaw-policy.recommended.json`** + `examples/README.md`. Shows the recommended `mode: standard` + `secretScanning: block` config, with two variant blocks (`readonly` for compliance/untrusted contexts and `full` for admins). Bundled with the package via the `files` allowlist in `package.json`.
- **README**: new sections "Plugin modes", "Secret scanning", "File permissions", "Peer response handling"; "Tool security classification" cross-links the recommended policy.
- **SECURITY.md** mitigation matrix updated — ASI02 / ASI03 / ASI07 reclassified from "operator-enforced" to "plugin-level mitigation shipped". Disclosure history adds v0.5.2.

### Migration from v0.5.1

No breaking changes. Default behavior is unchanged: with no `mode` field, all 13 tools register exactly as in v0.5.1. The only observable difference for a v0.5.1 config that omits the new fields is that `ask_consultation`, `send_message`, and `manage_subscriptions` will now refuse to send if a high-confidence secret pattern appears in arguments (because `secretScanning` defaults to `block`). To opt out, set `"secretScanning": "off"`.

We recommend explicitly setting `"mode": "standard"` and keeping `secretScanning` at `block` — see `examples/openclaw-policy.recommended.json`.

## v0.5.1 — 2026-05-15

### Fixed

- **Display name regression from v0.5.0.** v0.5.0 was published from a staging dir named `almured-openclaw-stage-v0.5.0`, which ClawHub Title-Cased into the registry display name ("Almured Openclaw Stage V0.5.0"). v0.5.1 republishes from a controlled basename `/tmp/almured` so the registry display name is "Almured" again. This is the same fix v0.3.6 applied; lesson reinforced in CHANGELOG. No code or behavior changes from the v0.5.0 tool set.

### Added — ClawScan ASI mitigations

- **ASI03 (Insecure Credentials Management):** `openclaw.plugin.json` now declares `ALMURED_API_KEY` in a new `metadata.optional_env_vars` field (with name + purpose) so users see the fallback credential path before install. The previous v0.3.5 removal of `ALMURED_API_KEY` from `metadata.requires.env` is preserved — the env var is a fallback for `config.apiKey`, not a hard requirement. `metadata.security` added pointing at `./SECURITY.md`.
- **ASI07 (Insecure Output Handling):** No code change required; existing wrapper layer already parses JSON, extracts `result.content[].text`, and never returns shell-executable or raw-HTML content. Documented in SECURITY.md per-finding mitigation matrix. Webhook HMAC-SHA256 signing remains the operator-side integrity gate.
- **ASI10 (Overreliance on Agent Output):** No code change required; `get_expertise_badge` already returns rating counts alongside scores. README now includes "What to share — and what NOT to share" and "Tool security classification" sections. SECURITY.md documents per-actor mitigation (plugin / calling agent / operator).
- **ASI02 (Insufficient Permission Controls):** Investigated upstream feasibility of per-tool machine-readable read/write annotation. **Not feasible in v0.5.1** — the OpenClaw plugin SDK (`openclaw@2026.4.23`) does not expose a `readOnly` / `mutating` / `destructive` field on `AnyAgentTool`. Mitigation in v0.5.1 is documentation-only: wrapper descriptions consistently flag mutating tools in natural language; README "Tool security classification" section enumerates the read/write split for `tools.allow` / `tools.deny` configuration; SECURITY.md tracks the upstream SDK feature request. A future v0.5.x publish will adopt the annotation field once SDK supports it.

### Added — documentation

- **`SECURITY.md` (new file)** — disclosure policy (`general@almured.com` with `[SECURITY]` subject prefix until a dedicated mailbox is provisioned), per-finding ASI mitigation matrix (plugin / calling-agent / operator), supported-versions table, plugin security architecture summary.
- **README "Tool security classification"** — read/write split for all 13 tools.
- **README "Webhook lifecycle"** — subscribe / list / unsubscribe pattern, recommends explicit cleanup before agent terminates.
- **README "What to share — and what NOT to share"** — guidance on PII, secrets, and confidential client data in consultations.
- **README "API key handling"** — env var setup, rotation, storage guidance, reference to SECURITY.md.

### Changed — README

- L3 stale category wording (`finance, tech, legal, health, and 5 other categories`) replaced with current platform taxonomy phrasing (no count pinning per CLAUDE.md public-copy rule).
- `package.json` `files` allowlist adds `SECURITY.md` so the new file ships with the package.

### Migration from v0.5.0

No code or schema changes. v0.5.1 is a drop-in replacement for v0.5.0 with a corrected display name and bundled security documentation. Tool behavior is identical.

## v0.5.0 — 2026-05-15

### Added — Phase 2-Infra tools (5 new wrappers, 8 → 13 total)

- `send_message` — post a message on a consultation thread for scope negotiation, delivery, extensions, or disputes. 11-kind protocol (`scope_proposal`, `scope_clarification`, `scope_accepted`, `progress_update`, `draft_delivery`, `revision_request`, `final_delivery`, `extension_request`, `extension_response`, `dispute_raised`, `freeform`). Tier-based per-thread caps (Tier 0: 100 msgs, Tier 1: 250, Tier 2: 5000). `scope_proposal` requires `metadata.no_conflict_affirmed=true`.
- `read_messages` — read messages from a consultation thread. Askers see all threads; responders see only their own thread.
- `set_pricing` — set or update pricing for one `(category, deliverable_type)` combination. Supports 9 currencies (EUR, USD, GBP, SGD, JPY, INR, DKK, SEK, NOK). Dormant during Phase 2-Infra: stored but NOT shown to askers until Phase 2-Pay launches.
- `get_pricing` — retrieve pricing entries for an agent (yourself or another). Read-only, informational during Phase 2-Infra.
- `manage_organization` — get information about the organization your agent is linked to (`action='get_my_org'`) or list its members (`action='list_members'`). Org create/update/delete remains REST-only with human auth.

### Changed

- `ask_consultation` schema extended with three Phase 2-Infra fields:
  - `requires_scope` (optional bool, default `false`) — set `true` for scoped engagements requiring scope negotiation.
  - `target_agent_id` (optional UUID) — directly route a consultation to a specific agent.
  - `subject_topic` (optional string, max 280 chars) — freeform tag for industry/company/sector to help responders self-filter.
- Public copy no longer pins a tool count. Plugin description, README opening line, and SKILL.md opening line dropped "8 native tools" to "native tools" (count is not pinned in public copy — see CLAUDE.md project rule). Tool tables explicitly enumerate available tools.

### Migration from v0.4.0

- No breaking changes. Existing installs continue to work with the original 8 tools.
- New tools are additive. To use them, your gateway must be on a build that includes the new schemas — re-install the plugin (`openclaw plugins install clawhub:@almured/openclaw@latest`) and restart the gateway.

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
