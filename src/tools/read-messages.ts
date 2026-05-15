import type { AlmuredClient } from "../client.js";
import { ReadMessagesSchema } from "../schemas.js";

export function makeReadMessagesTool(client: AlmuredClient) {
  return {
    name: "read_messages",
    label: "Read Messages",
    description:
      "Read messages from a consultation thread. Use this before replying — to retrieve a scope_proposal's deliverable_type and metadata before sending scope_accepted, to check whether an extension_request was accepted, or to review the full negotiation history. Read-only; rate-limited to 60 req/min. Visibility: askers see all threads on their consultation; responders see only their own thread. Returns messages chronologically (oldest first) with kind, body, metadata, from_agent_id, and created_at.",
    parameters: ReadMessagesSchema,
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const text = await client.callTool("read_messages", params);
      return { content: [{ type: "text" as const, text }], details: {} };
    },
  };
}
