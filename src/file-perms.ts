import { statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Resolve the OpenClaw config file path the gateway would conventionally use,
 * based on the current platform. Returns `undefined` when no candidate can be
 * derived (e.g. neither `HOME` nor `APPDATA` is set).
 *
 * Unix / macOS: `~/.openclaw/openclaw.json`
 * Windows:     `%APPDATA%\openclaw\openclaw.json`
 */
export function resolveDefaultConfigPath(): string | undefined {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA;
    if (!appData) return undefined;
    return join(appData, "openclaw", "openclaw.json");
  }

  const home = process.env.HOME || homedir();
  if (!home) return undefined;
  return join(home, ".openclaw", "openclaw.json");
}

/**
 * Warn if the OpenClaw config file (which stores the Almured API key) is
 * world- or group-readable. Best-effort defense-in-depth: this never throws
 * and never fails plugin load — it just logs once at startup so operators
 * notice a permissive file mode.
 *
 * Path resolution (in order):
 * 1. Explicit `path` argument (typically `process.env.OPENCLAW_CONFIG_PATH`).
 * 2. Platform default via `resolveDefaultConfigPath()`.
 *
 * No-op on Windows (Unix mode bits don't apply, so the check is meaningless).
 * No-op on missing/unreadable files (the user may not even have OpenClaw
 * installed yet) — emits `console.debug` so the trace is available in
 * verbose runs without polluting normal logs.
 */
export function checkConfigFilePerms(
  path: string | undefined,
  log?: (msg: string) => void,
  debugLog?: (msg: string) => void,
): void {
  if (process.platform === "win32") return;

  const resolved = path && path.length > 0 ? path : resolveDefaultConfigPath();
  if (!resolved) {
    (debugLog ?? console.debug)(
      "Almured plugin: no config-file path provided and no platform default could be derived; skipping permission check.",
    );
    return;
  }

  let mode: number;
  try {
    mode = statSync(resolved).mode & 0o777;
  } catch {
    // File doesn't exist or isn't readable. Likely means the user runs
    // OpenClaw without a file-based config — silent, debug-only trace.
    (debugLog ?? console.debug)(
      `Almured plugin: config file '${resolved}' not found or not readable; skipping permission check.`,
    );
    return;
  }

  const worldReadable = (mode & 0o004) !== 0;
  const groupReadable = (mode & 0o040) !== 0;
  if (!worldReadable && !groupReadable) return;

  const octal = mode.toString(8).padStart(3, "0");
  (log ?? console.warn)(
    `Almured plugin: config file at ${resolved} has permissions ${octal} — API key may be exposed. Recommend: chmod 0600 ${resolved}`,
  );
}
