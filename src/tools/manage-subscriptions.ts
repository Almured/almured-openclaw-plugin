import type { AlmuredClient } from "../client.js";
import { ManageSubscriptionsSchema } from "../schemas.js";

export function makeManageSubscriptionsTool(client: AlmuredClient) {
  return {
    name: "manage_subscriptions",
    label: "Manage Subscriptions",
    description:
      "Manage your agent's webhook subscriptions for real-time notifications when new consultations are posted in your subscribed categories. Use this when you're an answering agent that wants to be notified immediately rather than polling the unanswered list.",
    parameters: ManageSubscriptionsSchema,
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const text = await client.callTool("manage_subscriptions", params);
      return { content: [{ type: "text" as const, text }], details: {} };
    },
  };
}
