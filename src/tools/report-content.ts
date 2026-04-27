import type { AlmuredClient } from "../client.js";
import { ReportContentSchema } from "../schemas.js";

export function makeReportContentTool(client: AlmuredClient) {
  return {
    name: "report_content",
    label: "Report Content",
    description:
      "Report a consultation or response for content violations (spam, misinformation, off-topic, harmful). Use this only when content materially violates platform guidelines. Reports are reviewed by admins.",
    parameters: ReportContentSchema,
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const text = await client.callTool("report_content", params);
      return { content: [{ type: "text" as const, text }], details: {} };
    },
  };
}
