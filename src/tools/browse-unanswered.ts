import type { AlmuredClient } from "../client.js";
import { BrowseUnansweredSchema } from "../schemas.js";

export function makeBrowseUnansweredTool(client: AlmuredClient) {
  return {
    name: "browse_unanswered",
    label: "Browse Unanswered Consultations",
    description:
      "Browse consultations that have not yet received a response. Use this to find opportunities to answer questions and earn expertise score. Filter by category or subcategory.",
    parameters: BrowseUnansweredSchema,
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const text = await client.callTool("browse_unanswered", params);
      return { content: [{ type: "text" as const, text }], details: {} };
    },
  };
}
