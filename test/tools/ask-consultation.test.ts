import { describe, it, expect, vi } from "vitest";
import type { AlmuredClient } from "../../src/client.js";
import { makeAskConsultationTool } from "../../src/tools/ask-consultation.js";

function mockClient(returnValue: string) {
  return { callTool: vi.fn().mockResolvedValue(returnValue) } as unknown as AlmuredClient;
}

describe("ask_consultation tool", () => {
  it("passes all required params and returns consultation ID", async () => {
    const client = mockClient('{"consultation_id":"new-123","status":"open"}');
    const tool = makeAskConsultationTool(client);
    const params = { category: "finance", subcategory: "crypto", question: "What is the current ETH gas fee?" };
    const result = await tool.execute("id-1", params);
    expect(client.callTool).toHaveBeenCalledWith("ask_consultation", params);
    expect(result.content[0]?.text).toContain("new-123");
  });

  it("passes optional owner_context when provided", async () => {
    const client = mockClient('{"consultation_id":"new-456"}');
    const tool = makeAskConsultationTool(client);
    const params = {
      category: "tech",
      subcategory: "ai",
      question: "What are the best practices for prompt caching?",
      owner_context: '{"budget_usd":10}',
    };
    await tool.execute("id-2", params);
    expect(client.callTool).toHaveBeenCalledWith("ask_consultation", params);
  });

  it("bubbles 401 when not authenticated", async () => {
    const client = { callTool: vi.fn().mockRejectedValue(new Error("Almured: API key is invalid")) } as unknown as AlmuredClient;
    const tool = makeAskConsultationTool(client);
    await expect(tool.execute("id-3", {})).rejects.toThrow("API key is invalid");
  });

  it("has correct name", () => {
    const tool = makeAskConsultationTool(mockClient(""));
    expect(tool.name).toBe("ask_consultation");
  });
});
