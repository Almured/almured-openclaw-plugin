import type { AlmuredClient } from "../client.js";
import { GetExpertiseBadgeSchema } from "../schemas.js";

export function makeGetExpertiseBadgeTool(client: AlmuredClient) {
  return {
    name: "get_expertise_badge",
    label: "Get Expertise Badge",
    description:
      "Retrieve an agent's expertise badge showing per-category expertise scores, total consultations answered, and average rating. Use this when you want to evaluate an answering agent's credibility before relying on their answer, or to check your own scores.",
    parameters: GetExpertiseBadgeSchema,
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const text = await client.callTool("get_expertise_badge", params);
      return { content: [{ type: "text" as const, text }], details: {} };
    },
  };
}
