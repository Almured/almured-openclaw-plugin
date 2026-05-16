import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AlmuredClient } from "../src/client.js";

const LEAK_KEY = "secret-key-DONOTLEAK-12345";

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

describe("AlmuredClient — API key leak regression", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  let client: AlmuredClient;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    client = new AlmuredClient({ apiKey: LEAK_KEY });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("401 error message never contains the API key", async () => {
    fetchSpy.mockResolvedValue(makeResponse(401, ""));
    await expect(client.callTool("ask_consultation", {})).rejects.toThrow();
    try {
      await client.callTool("ask_consultation", {});
    } catch (err) {
      expect((err as Error).message).not.toContain(LEAK_KEY);
    }
  });

  it("422 with key echoed in body is redacted", async () => {
    const body = `validation failed: echoed back ${LEAK_KEY} oh no`;
    fetchSpy.mockResolvedValue(makeResponse(422, body));
    try {
      await client.callTool("ask_consultation", {});
      expect.fail("should have thrown");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).not.toContain(LEAK_KEY);
      expect(msg).toContain("[REDACTED]");
    }
  });

  it("429 with key in body is redacted", async () => {
    const body = `rate-limited; key was ${LEAK_KEY}`;
    fetchSpy.mockResolvedValue(makeResponse(429, body));
    try {
      await client.callTool("ask_consultation", {});
      expect.fail("should have thrown");
    } catch (err) {
      const msg = (err as Error).message;
      // 429 has a static message that doesn't include body — so no LEAK_KEY,
      // and no [REDACTED] needed either.
      expect(msg).not.toContain(LEAK_KEY);
    }
  });

  it("500 with key echoed twice is fully redacted", async () => {
    const body = `internal error ${LEAK_KEY} then ${LEAK_KEY} again`;
    fetchSpy.mockResolvedValue(makeResponse(500, body));
    try {
      await client.callTool("ask_consultation", {});
      expect.fail("should have thrown");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).not.toContain(LEAK_KEY);
      // Both occurrences replaced
      const redactedCount = (msg.match(/\[REDACTED\]/g) ?? []).length;
      expect(redactedCount).toBe(2);
    }
  });

  it("200 with JSON-RPC error whose message contains the key is redacted", async () => {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      error: { message: `Server upset about ${LEAK_KEY}`, data: { hint: `also ${LEAK_KEY}` } },
    });
    fetchSpy.mockResolvedValue(makeResponse(200, body));
    try {
      await client.callTool("ask_consultation", {});
      expect.fail("should have thrown");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).not.toContain(LEAK_KEY);
      expect(msg).toContain("[REDACTED]");
    }
  });

  it("happy path still returns content normally", async () => {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      result: { content: [{ type: "text", text: "hello" }] },
    });
    fetchSpy.mockResolvedValue(makeResponse(200, body));
    const result = await client.callTool("ask_consultation", {});
    expect(result).toBe("hello");
  });
});
