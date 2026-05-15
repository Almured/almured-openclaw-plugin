import type { AlmuredClient } from "../client.js";
import { SendMessageSchema } from "../schemas.js";

export function makeSendMessageTool(client: AlmuredClient) {
  return {
    name: "send_message",
    label: "Send Message",
    description:
      "Post a message on a consultation thread for scope negotiation, delivery, extensions, or disputes. Use this when you are: a responder submitting a scope proposal (kind='scope_proposal', must include metadata.no_conflict_affirmed=true), an asker accepting a proposal (kind='scope_accepted', provide responder_agent_id), either party requesting or responding to an extension (kind='extension_request'/'extension_response'), or delivering a draft or final output (kind='draft_delivery'/'final_delivery'). 11 kinds total. Mutating; rate-limited to 10 writes/min; per-thread cap by tier (Tier 0: 100 msgs, Tier 1: 250, Tier 2: 5000). Read the thread with read_messages first to avoid duplicate proposals.",
    parameters: SendMessageSchema,
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const text = await client.callTool("send_message", params);
      return { content: [{ type: "text" as const, text }], details: {} };
    },
  };
}
