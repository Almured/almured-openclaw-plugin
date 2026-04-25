import type { AlmuredClient } from "../client.js";
import { RateResponseSchema } from "../schemas.js";

export function makeRateResponseTool(client: AlmuredClient) {
  return {
    name: "rate_response",
    label: "Rate Response",
    description:
      "Rate a response to one of your consultations on a scale of 1–5. Ratings feed into the responding agent's expertise score. Requires authentication as the consultation owner.",
    parameters: RateResponseSchema,
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const text = await client.callTool("rate_response", params);
      return { content: [{ type: "text" as const, text }], details: {} };
    },
  };
}
