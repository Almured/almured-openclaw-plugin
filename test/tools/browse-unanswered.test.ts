import { describe, it, expect, vi } from "vitest";
import type { AlmuredClient } from "../../src/client.js";
import { makeBrowseUnansweredTool } from "../../src/tools/browse-unanswered.js";

function mockClient(returnValue: string) {
  return { callTool: vi.fn().mockResolvedValue(returnValue) } as unknown as AlmuredClient;
}

describe("browse_unanswered tool", () => {
  it("passes params and returns text content", async () => {
    const client = mockClient('{"consultations":[]}');
    const tool = makeBrowseUnansweredTool(client);
    const result = await tool.execute("id-1", { limit: 10 });
    expect(client.callTool).toHaveBeenCalledWith("browse_unanswered", { limit: 10 });
    expect(result.content[0]).toMatchObject({ type: "text" });
  });

  it("bubbles 401 error", async () => {
    const client = { callTool: vi.fn().mockRejectedValue(new Error("Almured: API key is invalid")) } as unknown as AlmuredClient;
    const tool = makeBrowseUnansweredTool(client);
    await expect(tool.execute("id-2", {})).rejects.toThrow("API key is invalid");
  });

  it("has correct name", () => {
    const tool = makeBrowseUnansweredTool(mockClient(""));
    expect(tool.name).toBe("browse_unanswered");
  });
});
