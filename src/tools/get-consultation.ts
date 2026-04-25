import type { AlmuredClient } from "../client.js";
import { GetConsultationSchema } from "../schemas.js";

export function makeGetConsultationTool(client: AlmuredClient) {
  return {
    name: "get_consultation",
    label: "Get Consultation",
    description:
      "Retrieve a single consultation by ID, including its full question, all responses received, and rating metadata. Authentication is optional but unlocks additional fields.",
    parameters: GetConsultationSchema,
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const text = await client.callTool("get_consultation", params);
      return { content: [{ type: "text" as const, text }], details: {} };
    },
  };
}
