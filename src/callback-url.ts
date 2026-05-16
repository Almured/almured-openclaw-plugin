/**
 * Defense-in-depth: reject obviously-unsafe webhook callback URLs at the
 * plugin layer so the marketplace server never sees them. The server-side
 * also enforces HTTPS, but checking here gives a clear, local error and
 * blocks SSRF-shaped values (localhost, RFC1918, link-local, etc.) that
 * an attacker might try to coerce an agent into registering.
 */

type IPv4 = [number, number, number, number];

const RFC1918_CHECKS: Array<(p: IPv4) => boolean> = [
  (p) => p[0] === 10,
  (p) => p[0] === 172 && p[1] >= 16 && p[1] <= 31,
  (p) => p[0] === 192 && p[1] === 168,
];

function isLoopbackIPv4(parts: IPv4): boolean {
  return parts[0] === 127;
}

function isLinkLocalIPv4(parts: IPv4): boolean {
  return parts[0] === 169 && parts[1] === 254;
}

function parseIPv4(host: string): IPv4 | null {
  const parts = host.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return null;
  }
  return [parts[0], parts[1], parts[2], parts[3]] as IPv4;
}

function isUnsafeHostname(hostnameRaw: string): { unsafe: boolean; reason: string } {
  const hostname = hostnameRaw.toLowerCase();

  // Loopback hostnames (covers `localhost`, `localhost.localdomain`, etc.)
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return { unsafe: true, reason: "loopback hostname (localhost)" };
  }

  // IPv6 loopback (`::1`) — comes in as `[::1]` after URL parsing strips brackets to `::1`.
  if (hostname === "::1" || hostname === "[::1]") {
    return { unsafe: true, reason: "IPv6 loopback address" };
  }

  // Reserved internal TLDs commonly used for service discovery.
  if (
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".intranet") ||
    hostname === "local" ||
    hostname === "internal"
  ) {
    return { unsafe: true, reason: "reserved internal TLD (.local / .internal / .intranet)" };
  }

  // IPv4 numeric host checks.
  const parts = parseIPv4(hostname);
  if (parts) {
    if (isLoopbackIPv4(parts)) return { unsafe: true, reason: "IPv4 loopback (127.0.0.0/8)" };
    if (isLinkLocalIPv4(parts)) {
      return {
        unsafe: true,
        reason: "IPv4 link-local (169.254.0.0/16) — includes cloud metadata endpoints",
      };
    }
    if (RFC1918_CHECKS.some((check) => check(parts))) {
      return {
        unsafe: true,
        reason: "RFC1918 private address (10/8, 172.16/12, 192.168/16)",
      };
    }
    if (parts[0] === 0) return { unsafe: true, reason: "IPv4 0.0.0.0/8 (unspecified/this-network)" };
  }

  return { unsafe: false, reason: "" };
}

/**
 * Throws if `url` is not a safe public HTTPS callback target.
 * Accepts: well-formed `https://` URL whose host is not loopback / private /
 *          link-local / reserved-internal-TLD / 0.0.0.0/8.
 * Rejects everything else with a message naming the failed check so the
 * agent / operator can see why their registration was refused.
 */
export function assertSafeCallbackUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      `Almured: callback_url '${url}' is not a valid URL. Provide an https:// URL on a publicly-reachable host.`,
    );
  }

  if (parsed.protocol !== "https:") {
    throw new Error(
      `Almured: callback_url scheme '${parsed.protocol.replace(":", "")}' is not allowed. Only https:// callbacks are accepted (http, ws, file, etc. are refused).`,
    );
  }

  const hostname = parsed.hostname; // already lowercased & bracket-stripped by URL parser
  if (!hostname) {
    throw new Error(`Almured: callback_url '${url}' has no hostname.`);
  }

  const { unsafe, reason } = isUnsafeHostname(hostname);
  if (unsafe) {
    throw new Error(
      `Almured: callback_url '${url}' refused — ${reason}. Webhook callbacks must target a publicly-reachable HTTPS endpoint, never an internal / loopback / private address (SSRF risk).`,
    );
  }
}
