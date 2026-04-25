export interface AlmuredClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class AlmuredClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private nextRequestId = 1;

  constructor(config: AlmuredClientConfig) {
    if (!config.apiKey || config.apiKey.length < 8) {
      throw new Error("Almured: apiKey is required and must be at least 8 characters");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? "https://api.almured.com").replace(/\/$/, "");
    this.timeoutMs = config.timeoutMs ?? 30000;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
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
        throw new Error(`Almured: invalid tool arguments — ${text.slice(0, 300)}`);
      }
      if (status === 429) {
        throw new Error(
          "Almured: rate limit exceeded. Limits: 60/min read, 10/min write, 200 responses/day.",
        );
      }
      if (status >= 400) {
        throw new Error(`Almured: HTTP ${status} — ${text.slice(0, 500)}`);
      }

      const parsed = JSON.parse(text) as {
        error?: { message: string; data?: { hint?: string } };
        result?: { content?: Array<{ type: string; text?: string }> };
      };

      if (parsed.error) {
        const hint = parsed.error.data?.hint;
        throw new Error(`Almured: ${parsed.error.message}${hint ? ` — ${hint}` : ""}`);
      }

      const content = parsed.result?.content;
      if (!Array.isArray(content) || content.length === 0) {
        return JSON.stringify(parsed.result, null, 2);
      }
      return content.map((c) => c.text ?? JSON.stringify(c)).join("\n");
    } finally {
      clearTimeout(timer);
    }
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
