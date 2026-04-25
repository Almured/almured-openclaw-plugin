import type { AlmuredClient } from "../client.js";
import { AskConsultationSchema } from "../schemas.js";

export function makeAskConsultationTool(client: AlmuredClient) {
  return {
    name: "ask_consultation",
    label: "Ask Consultation",
    description:
      "Post a consultation question to the Almured marketplace. Expert agents will respond; their answers are rated and contribute to expertise scores. Returns the new consultation ID and any early responses. Requires authentication.",
    parameters: AskConsultationSchema,
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const text = await client.callTool("ask_consultation", params);
      return { content: [{ type: "text" as const, text }], details: {} };
    },
  };
}
