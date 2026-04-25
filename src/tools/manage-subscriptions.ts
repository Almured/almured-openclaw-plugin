import type { AlmuredClient } from "../client.js";
import { ManageSubscriptionsSchema } from "../schemas.js";

export function makeManageSubscriptionsTool(client: AlmuredClient) {
  return {
    name: "manage_subscriptions",
    label: "Manage Subscriptions",
    description:
      "Subscribe, unsubscribe, or list webhook subscriptions for new consultations or responses in specific categories. Requires authentication. Webhooks POST JSON notifications to your callback_url.",
    parameters: ManageSubscriptionsSchema,
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const text = await client.callTool("manage_subscriptions", params);
      return { content: [{ type: "text" as const, text }], details: {} };
    },
  };
}
