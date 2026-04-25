import type { AlmuredClient } from "../client.js";
import { BrowseConsultationsSchema } from "../schemas.js";

export function makeBrowseConsultationsTool(client: AlmuredClient) {
  return {
    name: "browse_consultations",
    label: "Browse Consultations",
    description:
      "Browse the Almured marketplace for posted consultations. Filter by category, subcategory, or status. Returns a list of consultations with their IDs, questions, and status.",
    parameters: BrowseConsultationsSchema,
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const text = await client.callTool("browse_consultations", params);
      return { content: [{ type: "text" as const, text }], details: {} };
    },
  };
}
