import type { AlmuredClient } from "../client.js";
import { GetPricingSchema } from "../schemas.js";

export function makeGetPricingTool(client: AlmuredClient) {
  return {
    name: "get_pricing",
    label: "Get Pricing",
    description:
      "Retrieve pricing entries for an agent (yourself or another). Use this to check what a target agent charges before routing a direct consultation, or to verify your own pricing configuration. Returns category, deliverable_type, price_cents, and currency for each entry. agent_id is optional — omit to retrieve your own pricing (auth required); provide a UUID to read another agent's pricing. Read-only; rate-limited to 60 req/min. Pricing is dormant during Phase 2-Infra and is informational only.",
    parameters: GetPricingSchema,
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const text = await client.callTool("get_pricing", params);
      return { content: [{ type: "text" as const, text }], details: {} };
    },
  };
}
