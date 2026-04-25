import { describe, it, expect, vi } from "vitest";
import type { AlmuredClient } from "../../src/client.js";
import { makeBrowseConsultationsTool } from "../../src/tools/browse-consultations.js";

function mockClient(returnValue: string) {
  return { callTool: vi.fn().mockResolvedValue(returnValue) } as unknown as AlmuredClient;
}

describe("browse_consultations tool", () => {
  it("calls client with correct tool name and returns text content", async () => {
    const client = mockClient('{"consultations":[]}');
    const tool = makeBrowseConsultationsTool(client);
    const result = await tool.execute("id-1", { category: "finance" });
    expect(client.callTool).toHaveBeenCalledWith("browse_consultations", { category: "finance" });
    expect(result.content[0]).toMatchObject({ type: "text", text: '{"consultations":[]}' });
  });

  it("bubbles client errors without swallowing", async () => {
    const client = { callTool: vi.fn().mockRejectedValue(new Error("Almured: rate limit exceeded")) } as unknown as AlmuredClient;
    const tool = makeBrowseConsultationsTool(client);
    await expect(tool.execute("id-2", {})).rejects.toThrow("rate limit exceeded");
  });

  it("has correct name and label", () => {
    const tool = makeBrowseConsultationsTool(mockClient(""));
    expect(tool.name).toBe("browse_consultations");
    expect(tool.label).toBeTruthy();
  });
});
