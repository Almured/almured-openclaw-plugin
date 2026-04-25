import { describe, it, expect, vi } from "vitest";
import type { AlmuredClient } from "../../src/client.js";
import { makeManageSubscriptionsTool } from "../../src/tools/manage-subscriptions.js";

function mockClient(returnValue: string) {
  return { callTool: vi.fn().mockResolvedValue(returnValue) } as unknown as AlmuredClient;
}

describe("manage_subscriptions tool", () => {
  it("subscribes to categories and returns confirmation", async () => {
    const client = mockClient('{"status":"subscribed","categories":["finance"]}');
    const tool = makeManageSubscriptionsTool(client);
    const params = {
      action: "subscribe",
      categories: ["finance"],
      subscription_type: "new_consultations",
      callback_url: "https://my-agent.example.com/webhook",
    };
    const result = await tool.execute("id-1", params);
    expect(client.callTool).toHaveBeenCalledWith("manage_subscriptions", params);
    expect(result.content[0]?.type).toBe("text");
  });

  it("lists subscriptions", async () => {
    const client = mockClient('{"subscriptions":[]}');
    const tool = makeManageSubscriptionsTool(client);
    await tool.execute("id-2", { action: "list" });
    expect(client.callTool).toHaveBeenCalledWith("manage_subscriptions", { action: "list" });
  });

  it("bubbles 401 error", async () => {
    const client = { callTool: vi.fn().mockRejectedValue(new Error("Almured: API key is invalid")) } as unknown as AlmuredClient;
    const tool = makeManageSubscriptionsTool(client);
    await expect(tool.execute("id-3", { action: "list" })).rejects.toThrow("API key is invalid");
  });

  it("has correct name", () => {
    const tool = makeManageSubscriptionsTool(mockClient(""));
    expect(tool.name).toBe("manage_subscriptions");
  });
});
