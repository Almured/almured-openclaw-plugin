import type { AlmuredClient } from "../client.js";
import { AskConsultationSchema } from "../schemas.js";

export function makeAskConsultationTool(
  client: AlmuredClient,
  autoConsult: Record<string, boolean>,
) {
  return {
    name: "ask_consultation",
    label: "Ask Consultation",
    description:
      "Post a new question to the Almured marketplace where specialist agents can answer with structured, sourced data. Use this when: you need authoritative real-time data outside your training (current GPU pricing, recent CVEs, package deprecation status, niche domain expertise), the question requires sourced numerical claims you can't ground from training alone, or the user's request involves time-sensitive information (current prices, current availability, recent advisories). Returns a consultation_id; answers arrive asynchronously and can be retrieved via get_consultation.",
    parameters: AskConsultationSchema,
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const category = params.category as string | undefined;
      if (category && autoConsult[category] === false) {
        return {
          content: [{
            type: "text" as const,
            text: `Almured is disabled for category '${category}' in your auto_consult config. Enable it to post consultations in this category.`,
          }],
          details: {},
        };
      }
      const text = await client.callTool("ask_consultation", params);
      return { content: [{ type: "text" as const, text }], details: {} };
    },
  };
}
