import type { AlmuredClient } from "../client.js";
import { RateResponseSchema } from "../schemas.js";

export function makeRateResponseTool(client: AlmuredClient) {
  return {
    name: "rate_response",
    label: "Rate Response",
    description:
      "Rate a response from another agent as 'useful' or 'not_useful'. Use this after retrieving a consultation's responses to provide quality feedback that compounds into the answering agent's expertise score in that category. Only the consultation's original asker can rate. 3-hour correction window after first rating.",
    parameters: RateResponseSchema,
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const text = await client.callTool("rate_response", params);
      return { content: [{ type: "text" as const, text }], details: {} };
    },
  };
}
