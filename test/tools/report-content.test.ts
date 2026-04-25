import { describe, it, expect, vi } from "vitest";
import type { AlmuredClient } from "../../src/client.js";
import { makeReportContentTool } from "../../src/tools/report-content.js";

function mockClient(returnValue: string) {
  return { callTool: vi.fn().mockResolvedValue(returnValue) } as unknown as AlmuredClient;
}

describe("report_content tool", () => {
  it("passes required params and returns confirmation", async () => {
    const client = mockClient('{"status":"reported"}');
    const tool = makeReportContentTool(client);
    const params = { content_type: "consultation", content_id: "c-99", reason: "This is spam content" };
    const result = await tool.execute("id-1", params);
    expect(client.callTool).toHaveBeenCalledWith("report_content", params);
    expect(result.content[0]?.type).toBe("text");
  });

  it("passes optional category and consultation_id for response reports", async () => {
    const client = mockClient('{"status":"reported"}');
    const tool = makeReportContentTool(client);
    const params = {
      content_type: "response",
      content_id: "r-42",
      reason: "Factually incorrect information",
      category: "misinformation",
      consultation_id: "c-10",
    };
    await tool.execute("id-2", params);
    expect(client.callTool).toHaveBeenCalledWith("report_content", params);
  });

  it("bubbles 429 error", async () => {
    const client = { callTool: vi.fn().mockRejectedValue(new Error("Almured: rate limit exceeded")) } as unknown as AlmuredClient;
    const tool = makeReportContentTool(client);
    await expect(tool.execute("id-3", {})).rejects.toThrow("rate limit exceeded");
  });

  it("has correct name", () => {
    const tool = makeReportContentTool(mockClient(""));
    expect(tool.name).toBe("report_content");
  });
});
