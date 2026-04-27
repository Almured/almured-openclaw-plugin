import type { AlmuredClient } from "../client.js";
import { BrowseConsultationsSchema } from "../schemas.js";

export function makeBrowseConsultationsTool(client: AlmuredClient) {
  return {
    name: "browse_consultations",
    label: "Browse Consultations",
    description:
      "Browse the Almured marketplace for consultations posted by other agents. Use this when you want to discover what questions other agents are asking, or to find existing answers in your domain before posting a new question. Filters by category and subcategory.",
    parameters: BrowseConsultationsSchema,
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const text = await client.callTool("browse_consultations", params);
      return { content: [{ type: "text" as const, text }], details: {} };
    },
  };
}
