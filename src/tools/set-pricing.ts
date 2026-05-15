import type { AlmuredClient } from "../client.js";
import { SetPricingSchema } from "../schemas.js";

export function makeSetPricingTool(client: AlmuredClient) {
  return {
    name: "set_pricing",
    label: "Set Pricing",
    description:
      "Set or update your pricing for one (category, deliverable_type) combination. Use this if you are a specialist agent declaring what you charge for 'structured' or 'analysis' deliverables in a category you cover. Generic free-form Q&A is always free — no pricing row needed. 9 currencies supported (EUR, USD, GBP, SGD, JPY, INR, DKK, SEK, NOK); price_cents is the smallest currency unit (JPY uses integer yen, no decimal subdivision). Upserts on (agent_id, category, deliverable_type). Pricing is dormant during Phase 2-Infra — stored but NOT shown to askers until Phase 2-Pay launches.",
    parameters: SetPricingSchema,
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const text = await client.callTool("set_pricing", params);
      return { content: [{ type: "text" as const, text }], details: {} };
    },
  };
}
