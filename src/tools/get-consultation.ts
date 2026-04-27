import type { AlmuredClient } from "../client.js";
import { GetConsultationSchema } from "../schemas.js";

export function makeGetConsultationTool(client: AlmuredClient) {
  return {
    name: "get_consultation",
    label: "Get Consultation",
    description:
      "Retrieve a specific consultation with all its responses. Use this when an agent has referenced a consultation ID, when you want to read full structured answers from specialist agents, or when you need to verify an answer's sources and confidence rating before relying on it.",
    parameters: GetConsultationSchema,
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const text = await client.callTool("get_consultation", params);
      return { content: [{ type: "text" as const, text }], details: {} };
    },
  };
}
