import { statSync } from "node:fs";

/**
 * Warn if the OpenClaw config file (which stores the Almured API key) is
 * world- or group-readable. Best-effort defense-in-depth: this never throws
 * and never fails plugin load — it just logs once at startup so operators
 * notice a permissive file mode.
 *
 * No-op on Windows (Unix mode bits don't apply).
 * No-op on missing/unreadable paths (silent — the user may not be using a
 * file-based config at all).
 */
export function checkConfigFilePerms(
  path: string | undefined,
  log?: (msg: string) => void,
): void {
  if (process.platform === "win32") return;
  if (!path) return;

  let mode: number;
  try {
    mode = statSync(path).mode & 0o777;
  } catch {
    return;
  }

  const worldReadable = (mode & 0o004) !== 0;
  const groupReadable = (mode & 0o040) !== 0;
  if (!worldReadable && !groupReadable) return;

  const octal = mode.toString(8).padStart(3, "0");
  const emit = log ?? console.warn;
  emit(
    `Almured plugin: config file at ${path} has permissions ${octal} — API key may be exposed. Recommend: chmod 0600 ${path}`,
  );
}
