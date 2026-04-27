import { describe, it, expect, vi } from "vitest";
import type { AlmuredClient } from "../../src/client.js";
import { makeAskConsultationTool } from "../../src/tools/ask-consultation.js";
import { buildAutoConsult } from "../../src/index.js";

function mockClient(returnValue: string) {
  return { callTool: vi.fn().mockResolvedValue(returnValue) } as unknown as AlmuredClient;
}

// Default auto_consult: all categories enabled
const allEnabled = buildAutoConsult();

describe("ask_consultation tool", () => {
  it("passes all required params and returns consultation ID", async () => {
    const client = mockClient('{"consultation_id":"new-123","status":"open"}');
    const tool = makeAskConsultationTool(client, allEnabled);
    const params = { category: "ai_ml", subcategory: "inference", question: "What is the cheapest inference provider for Llama 3.3 70B?" };
    const result = await tool.execute("id-1", params);
    expect(client.callTool).toHaveBeenCalledWith("ask_consultation", params);
    expect(result.content[0]?.text).toContain("new-123");
  });

  it("passes optional owner_context when provided", async () => {
    const client = mockClient('{"consultation_id":"new-456"}');
    const tool = makeAskConsultationTool(client, allEnabled);
    const params = {
      category: "security",
      subcategory: "cve_intel",
      question: "What CVEs affect OpenSSL 3.x this month?",
      owner_context: '{"severity":"critical"}',
    };
    await tool.execute("id-2", params);
    expect(client.callTool).toHaveBeenCalledWith("ask_consultation", params);
  });

  it("bubbles 401 when not authenticated", async () => {
    const client = { callTool: vi.fn().mockRejectedValue(new Error("Almured: API key is invalid")) } as unknown as AlmuredClient;
    const tool = makeAskConsultationTool(client, allEnabled);
    await expect(tool.execute("id-3", {})).rejects.toThrow("API key is invalid");
  });

  it("has correct name", () => {
    const tool = makeAskConsultationTool(mockClient(""), allEnabled);
    expect(tool.name).toBe("ask_consultation");
  });

  it("returns disabled message when category is turned off in auto_consult", async () => {
    const client = mockClient("should not be called");
    const autoConsult = buildAutoConsult({ ai_ml: false });
    const tool = makeAskConsultationTool(client, autoConsult);
    const result = await tool.execute("id-4", { category: "ai_ml", subcategory: "inference", question: "test?" });
    expect(client.callTool).not.toHaveBeenCalled();
    expect(result.content[0].text).toMatch(/disabled/i);
    expect(result.content[0].text).toContain("ai_ml");
  });

  it("passes through when a different category is disabled but the requested one is enabled", async () => {
    const client = mockClient('{"consultation_id":"new-789"}');
    const autoConsult = buildAutoConsult({ security: false });
    const tool = makeAskConsultationTool(client, autoConsult);
    const result = await tool.execute("id-5", { category: "ai_ml", subcategory: "inference", question: "test?" });
    expect(client.callTool).toHaveBeenCalled();
    expect(result.content[0].text).toContain("new-789");
  });
});
