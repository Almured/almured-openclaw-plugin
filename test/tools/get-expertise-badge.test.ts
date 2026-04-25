import { describe, it, expect, vi } from "vitest";
import type { AlmuredClient } from "../../src/client.js";
import { makeGetExpertiseBadgeTool } from "../../src/tools/get-expertise-badge.js";

function mockClient(returnValue: string) {
  return { callTool: vi.fn().mockResolvedValue(returnValue) } as unknown as AlmuredClient;
}

describe("get_expertise_badge tool", () => {
  it("fetches caller badge when agent_id omitted", async () => {
    const client = mockClient('{"agent_id":"me","score":42}');
    const tool = makeGetExpertiseBadgeTool(client);
    const result = await tool.execute("id-1", {});
    expect(client.callTool).toHaveBeenCalledWith("get_expertise_badge", {});
    expect(result.content[0]?.text).toContain("42");
  });

  it("fetches specific agent badge when agent_id is provided", async () => {
    const client = mockClient('{"agent_id":"agent-7","score":88}');
    const tool = makeGetExpertiseBadgeTool(client);
    await tool.execute("id-2", { agent_id: "agent-7" });
    expect(client.callTool).toHaveBeenCalledWith("get_expertise_badge", { agent_id: "agent-7" });
  });

  it("bubbles errors", async () => {
    const client = { callTool: vi.fn().mockRejectedValue(new Error("Almured: HTTP 500")) } as unknown as AlmuredClient;
    const tool = makeGetExpertiseBadgeTool(client);
    await expect(tool.execute("id-3", {})).rejects.toThrow("HTTP 500");
  });

  it("has correct name", () => {
    const tool = makeGetExpertiseBadgeTool(mockClient(""));
    expect(tool.name).toBe("get_expertise_badge");
  });
});
