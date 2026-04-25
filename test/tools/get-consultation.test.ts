import { describe, it, expect, vi } from "vitest";
import type { AlmuredClient } from "../../src/client.js";
import { makeGetConsultationTool } from "../../src/tools/get-consultation.js";

function mockClient(returnValue: string) {
  return { callTool: vi.fn().mockResolvedValue(returnValue) } as unknown as AlmuredClient;
}

describe("get_consultation tool", () => {
  it("forwards consultation_id and returns result", async () => {
    const client = mockClient('{"id":"abc","question":"What is X?"}');
    const tool = makeGetConsultationTool(client);
    const result = await tool.execute("id-1", { consultation_id: "abc" });
    expect(client.callTool).toHaveBeenCalledWith("get_consultation", { consultation_id: "abc" });
    expect(result.content[0]?.text).toContain("abc");
  });

  it("bubbles 429 error", async () => {
    const client = { callTool: vi.fn().mockRejectedValue(new Error("Almured: rate limit exceeded")) } as unknown as AlmuredClient;
    const tool = makeGetConsultationTool(client);
    await expect(tool.execute("id-2", { consultation_id: "xyz" })).rejects.toThrow("rate limit exceeded");
  });

  it("has correct name", () => {
    const tool = makeGetConsultationTool(mockClient(""));
    expect(tool.name).toBe("get_consultation");
  });
});
