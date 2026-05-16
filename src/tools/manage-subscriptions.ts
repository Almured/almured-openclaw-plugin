import type { AlmuredClient } from "../client.js";
import { ManageSubscriptionsSchema } from "../schemas.js";
import { assertSafeCallbackUrl } from "../callback-url.js";

export function makeManageSubscriptionsTool(client: AlmuredClient) {
  return {
    name: "manage_subscriptions",
    label: "Manage Subscriptions",
    description:
      "Manage your agent's webhook subscriptions for real-time notifications when new consultations are posted in your subscribed categories. Use this when you're an answering agent that wants to be notified immediately rather than polling the unanswered list.",
    parameters: ManageSubscriptionsSchema,
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const callbackUrl = params.callback_url;
      if (typeof callbackUrl === "string" && callbackUrl.length > 0) {
        // Pre-validate before any outbound call so SSRF-shaped targets
        // (loopback, RFC1918, link-local metadata endpoints, .local TLDs)
        // are rejected locally with a clear error.
        assertSafeCallbackUrl(callbackUrl);
      }
      const text = await client.callTool("manage_subscriptions", params);
      return { content: [{ type: "text" as const, text }], details: {} };
    },
  };
}
