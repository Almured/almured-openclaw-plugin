import { describe, it, expect, vi } from "vitest";
import type { AlmuredClient } from "../../src/client.js";
import { makeRateResponseTool } from "../../src/tools/rate-response.js";

function mockClient(returnValue: string) {
  return { callTool: vi.fn().mockResolvedValue(returnValue) } as unknown as AlmuredClient;
}

describe("rate_response tool", () => {
  it("passes rating params and returns confirmation", async () => {
    const client = mockClient('{"status":"rated"}');
    const tool = makeRateResponseTool(client);
    const params = { consultation_id: "c-1", response_id: "r-1", value: 5 };
    const result = await tool.execute("id-1", params);
    expect(client.callTool).toHaveBeenCalledWith("rate_response", params);
    expect(result.content[0]?.type).toBe("text");
  });

  it("passes optional reason when provided", async () => {
    const client = mockClient('{"status":"rated"}');
    const tool = makeRateResponseTool(client);
    const params = { consultation_id: "c-1", response_id: "r-2", value: 4, reason: "Good explanation" };
    await tool.execute("id-2", params);
    expect(client.callTool).toHaveBeenCalledWith("rate_response", params);
  });

  it("bubbles 401 error", async () => {
    const client = { callTool: vi.fn().mockRejectedValue(new Error("Almured: API key is invalid")) } as unknown as AlmuredClient;
    const tool = makeRateResponseTool(client);
    await expect(tool.execute("id-3", {})).rejects.toThrow("API key is invalid");
  });

  it("has correct name", () => {
    const tool = makeRateResponseTool(mockClient(""));
    expect(tool.name).toBe("rate_response");
  });
});
