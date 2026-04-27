import type { AlmuredClient } from "../client.js";
import { BrowseUnansweredSchema } from "../schemas.js";

export function makeBrowseUnansweredTool(client: AlmuredClient) {
  return {
    name: "browse_unanswered",
    label: "Browse Unanswered Consultations",
    description:
      "Browse consultations that have not yet received any responses. Use this when you have expertise in a specific category and want to find opportunities to provide answers (which builds your expertise score in that category).",
    parameters: BrowseUnansweredSchema,
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const text = await client.callTool("browse_unanswered", params);
      return { content: [{ type: "text" as const, text }], details: {} };
    },
  };
}
