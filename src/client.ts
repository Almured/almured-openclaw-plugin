import { scanForSecrets, type SecretScanMode } from "./secret-scanner.js";
import { logInjectionWarnings } from "./response-sanitizer.js";

export interface AlmuredClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  /** Default 'block': refuse-to-send when high-confidence secret patterns appear in outbound args. */
  secretScanning?: SecretScanMode;
}

/** Outbound tools that carry user-authored free-text payloads worth scanning. */
const SECRET_SCAN_TOOLS = new Set([
  "ask_consultation",
  "send_message",
  "manage_subscriptions",
]);

export class AlmuredClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly secretScanning: SecretScanMode;
  private nextRequestId = 1;

  constructor(config: AlmuredClientConfig) {
    if (!config.apiKey || config.apiKey.length < 8) {
      throw new Error("Almured: apiKey is required and must be at least 8 characters");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? "https://api.almured.com").replace(/\/$/, "");
    this.timeoutMs = config.timeoutMs ?? 30000;
    this.secretScanning = config.secretScanning ?? "block";
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    // Defense-in-depth (ASI07): scan outbound args for high-confidence secrets
    // on the small set of tools that carry user-authored free-text. Default
    // 'block' refuses to send. Read tools are not scanned — their args are
    // structured filters, not user prose, and scanning them risks blocking
    // legitimate categorical questions.
    if (SECRET_SCAN_TOOLS.has(name) && this.secretScanning !== "off") {
      const matches = scanForSecrets(JSON.stringify(args));
      if (matches.length > 0) {
        const summary = matches
          .map((m) => `${m.pattern} (${m.preview})`)
          .join(", ");
        if (this.secretScanning === "block") {
          throw new Error(
            `Almured: outbound secret-scan blocked '${name}' — detected ${matches.length} potential secret(s): ${summary}. Remove the value, or set secretScanning='warn' / 'off' to override.`,
          );
        }
        // warn mode: log per match, then send.
        for (const m of matches) {
          console.warn(
            `Almured: outbound secret-scan WARN on '${name}' — pattern '${m.pattern}' (${m.preview}) at index ${m.index}. Sending anyway because secretScanning='warn'.`,
          );
        }
      }
    }

    const id = this.nextRequestId++;
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: { name, arguments: args },
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body,
        signal: controller.signal,
      });

      const status = response.status;
      const contentType = response.headers.get("content-type") ?? "";

      let text: string;
      if (contentType.includes("text/event-stream")) {
        text = await this.parseSSEResponse(response);
      } else {
        text = await response.text();
      }

      if (status === 401) {
        throw new Error(
          "Almured: API key is invalid or revoked. Generate a new one at https://almured.com/account.",
        );
      }
      if (status === 406) {
        throw new Error(
          "Almured: transport mismatch. The plugin sends streamable-HTTP — check your Almured server version.",
        );
      }
      if (status === 422) {
        throw new Error(this.redact(`Almured: invalid tool arguments — ${text.slice(0, 300)}`));
      }
      if (status === 429) {
        throw new Error(
          "Almured: rate limit exceeded. Limits: 60/min read, 10/min write, 200 responses/day.",
        );
      }
      if (status >= 400) {
        throw new Error(this.redact(`Almured: HTTP ${status} — ${text.slice(0, 500)}`));
      }

      const parsed = JSON.parse(text) as {
        error?: { message: string; data?: { hint?: string } };
        result?: { content?: Array<{ type: string; text?: string }> };
      };

      if (parsed.error) {
        const hint = parsed.error.data?.hint;
        throw new Error(
          this.redact(`Almured: ${parsed.error.message}${hint ? ` — ${hint}` : ""}`),
        );
      }

      const content = parsed.result?.content;
      const merged =
        !Array.isArray(content) || content.length === 0
          ? JSON.stringify(parsed.result, null, 2)
          : content.map((c) => c.text ?? JSON.stringify(c)).join("\n");

      // Defense-in-depth: scan peer-authored response text for known prompt-
      // injection patterns. Log only — never modify the response.
      logInjectionWarnings(merged);
      return merged;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Defense-in-depth: strip the API key from any error string before it
   * surfaces to logs or callers. A buggy or malicious upstream could echo
   * the Authorization header back in an error body; this guarantees we
   * never propagate that.
   */
  private redact(msg: string): string {
    if (!this.apiKey) return msg;
    return msg.split(this.apiKey).join("[REDACTED]");
  }

  private async parseSSEResponse(response: Response): Promise<string> {
    const raw = await response.text();
    const lines = raw.split("\n");
    let lastDataLine = "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        lastDataLine = line.slice(6);
      }
    }
    return lastDataLine || raw;
  }
}
