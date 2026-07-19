import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AlmuredClient } from "../src/client.js";

function makeResponse(
  status: number,
  body: string,
  contentType = "application/json",
): Response {
  return {
    status,
    headers: { get: (k: string) => (k === "content-type" ? contentType : null) },
    text: async () => body,
  } as unknown as Response;
}

describe("AlmuredClient constructor", () => {
  it("throws when apiKey is missing", () => {
    expect(() => new AlmuredClient({ apiKey: "" })).toThrow(
      "apiKey is required",
    );
  });

  it("throws when apiKey is too short", () => {
    expect(() => new AlmuredClient({ apiKey: "short" })).toThrow(
      "at least 8 characters",
    );
  });

  it("constructs successfully with valid apiKey", () => {
    expect(() => new AlmuredClient({ apiKey: "sk_live_valid_key" })).not.toThrow();
  });
});

describe("AlmuredClient.callTool", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns content text from successful JSON response", async () => {
    const payload = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      result: { content: [{ type: "text", text: "Hello from Almured" }] },
    });
    fetchSpy.mockResolvedValue(makeResponse(200, payload));

    const client = new AlmuredClient({ apiKey: "sk_live_test_key" });
    const result = await client.callTool("get_consultation", { consultation_id: "abc" });
    expect(result).toBe("Hello from Almured");
  });

  it("joins multiple content items with newline", async () => {
    const payload = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      result: {
        content: [
          { type: "text", text: "Part one" },
          { type: "text", text: "Part two" },
        ],
      },
    });
    fetchSpy.mockResolvedValue(makeResponse(200, payload));

    const client = new AlmuredClient({ apiKey: "sk_live_test_key" });
    const result = await client.callTool("browse_consultations", {});
    expect(result).toBe("Part one\nPart two");
  });

  it("throws a friendly error on 401", async () => {
    fetchSpy.mockResolvedValue(makeResponse(401, "Unauthorized"));
    const client = new AlmuredClient({ apiKey: "sk_live_test_key" });
    await expect(client.callTool("ask_consultation", {})).rejects.toThrow(
      "API key is invalid or revoked",
    );
  });

  it("throws a friendly error on 406", async () => {
    fetchSpy.mockResolvedValue(makeResponse(406, "Not Acceptable"));
    const client = new AlmuredClient({ apiKey: "sk_live_test_key" });
    await expect(client.callTool("browse_consultations", {})).rejects.toThrow(
      "transport mismatch",
    );
  });

  it("throws a friendly error on 422", async () => {
    fetchSpy.mockResolvedValue(makeResponse(422, '{"detail":"missing field"}'));
    const client = new AlmuredClient({ apiKey: "sk_live_test_key" });
    await expect(client.callTool("ask_consultation", {})).rejects.toThrow(
      "invalid tool arguments",
    );
  });

  it("throws a friendly error on 429", async () => {
    fetchSpy.mockResolvedValue(makeResponse(429, "Too Many Requests"));
    const client = new AlmuredClient({ apiKey: "sk_live_test_key" });
    await expect(client.callTool("browse_unanswered", {})).rejects.toThrow(
      "rate limit exceeded",
    );
  });

  it("throws on generic 500", async () => {
    fetchSpy.mockResolvedValue(makeResponse(500, "Internal Server Error"));
    const client = new AlmuredClient({ apiKey: "sk_live_test_key" });
    await expect(client.callTool("browse_consultations", {})).rejects.toThrow(
      "HTTP 500",
    );
  });

  it("propagates JSON-RPC error from server", async () => {
    const payload = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      error: { message: "Tool not found", data: { hint: "Check tool name" } },
    });
    fetchSpy.mockResolvedValue(makeResponse(200, payload));
    const client = new AlmuredClient({ apiKey: "sk_live_test_key" });
    await expect(client.callTool("bad_tool", {})).rejects.toThrow(
      "Tool not found - Check tool name",
    );
  });

  it("parses an SSE response", async () => {
    const sseBody = [
      'event: message',
      'data: {"jsonrpc":"2.0","id":1,"result":{"content":[{"type":"text","text":"SSE result"}]}}',
      '',
    ].join("\n");
    fetchSpy.mockResolvedValue(makeResponse(200, sseBody, "text/event-stream"));
    const client = new AlmuredClient({ apiKey: "sk_live_test_key" });
    const result = await client.callTool("get_expertise_badge", {});
    expect(result).toBe("SSE result");
  });

  it("parses valid SSE data fields without a space", async () => {
    const sseBody =
      'data:{"jsonrpc":"2.0","id":1,"result":{"content":[{"type":"text","text":"No-space SSE result"}]}}\n\n';
    fetchSpy.mockResolvedValue(makeResponse(200, sseBody, "text/event-stream"));
    const client = new AlmuredClient({ apiKey: "sk_live_test_key" });
    const result = await client.callTool("get_expertise_badge", {});
    expect(result).toBe("No-space SSE result");
  });

  it("returns the last complete SSE event", async () => {
    const firstEvent =
      'data: {"jsonrpc":"2.0","id":1,"result":{"content":[{"type":"text","text":"First result"}]}}';
    const lastEvent =
      'data: {"jsonrpc":"2.0","id":1,"result":{"content":[{"type":"text","text":"Last result"}]}}';
    fetchSpy.mockResolvedValue(
      makeResponse(200, `${firstEvent}\r\n\r\n${lastEvent}\r\n\r\n`, "text/event-stream"),
    );
    const client = new AlmuredClient({ apiKey: "sk_live_test_key" });
    const result = await client.callTool("get_expertise_badge", {});
    expect(result).toBe("Last result");
  });

  it("sends Authorization header with Bearer token", async () => {
    const payload = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      result: { content: [{ type: "text", text: "ok" }] },
    });
    fetchSpy.mockResolvedValue(makeResponse(200, payload));
    const client = new AlmuredClient({ apiKey: "sk_live_my_secret" });
    await client.callTool("browse_consultations", {});

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)?.["Authorization"]).toBe(
      "Bearer sk_live_my_secret",
    );
  });

  it("aborts the request after timeout", async () => {
    vi.useFakeTimers();
    fetchSpy.mockImplementation(
      (_url: string, { signal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () =>
            reject(new DOMException("The operation was aborted.", "AbortError")),
          );
        }),
    );

    const client = new AlmuredClient({ apiKey: "sk_live_test_key", timeoutMs: 1000 });
    const resultPromise = client.callTool("browse_consultations", {});
    vi.advanceTimersByTime(1001);
    await expect(resultPromise).rejects.toThrow();
    vi.useRealTimers();
  });
});
