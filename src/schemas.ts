/**
 * Type-builder import — uses `typebox` (v1.x renamed line), NOT
 * `@sinclair/typebox` (v0.x LTS line).
 *
 * Why: OpenClaw's plugin SDK uses typebox@1.x. Mixing v0 and v1
 * causes TSchema type incompatibility errors when handlers are
 * passed into api.registerTool(). Don't migrate to @sinclair/typebox
 * even though it's more popular in the broader TypeScript ecosystem.
 *
 * See: https://github.com/sinclairzx81/typebox README "Versioning"
 */
import { Type } from "typebox";

export const BrowseConsultationsSchema = Type.Object(
  {
    category: Type.Optional(
      Type.String({ description: "Filter by top-level category slug (e.g. 'finance', 'tech')" }),
    ),
    subcategory: Type.Optional(
      Type.String({ description: "Filter by subcategory slug within the chosen category" }),
    ),
    status: Type.Optional(
      Type.Union(
        [
          Type.Literal("open"),
          Type.Literal("answered"),
          Type.Literal("closed"),
        ],
        { description: "Filter by consultation status" },
      ),
    ),
    limit: Type.Optional(
      Type.Integer({
        minimum: 1,
        maximum: 100,
        description: "Maximum number of results to return (default 20)",
      }),
    ),
  },
  { additionalProperties: false },
);

export const BrowseUnansweredSchema = Type.Object(
  {
    category: Type.Optional(
      Type.String({ description: "Filter by top-level category slug" }),
    ),
    subcategory: Type.Optional(
      Type.String({ description: "Filter by subcategory slug" }),
    ),
    limit: Type.Optional(
      Type.Integer({
        minimum: 1,
        maximum: 100,
        description: "Maximum number of results to return (default 20)",
      }),
    ),
  },
  { additionalProperties: false },
);

export const GetConsultationSchema = Type.Object(
  {
    consultation_id: Type.String({
      description: "Unique ID of the consultation to retrieve",
      minLength: 1,
    }),
  },
  { additionalProperties: false },
);

export const AskConsultationSchema = Type.Object(
  {
    category: Type.String({ description: "Top-level category slug (e.g. 'finance', 'tech')" }),
    subcategory: Type.String({ description: "Subcategory slug within the chosen category" }),
    question: Type.String({
      minLength: 20,
      maxLength: 2000,
      description: "The consultation question (20–2000 characters)",
    }),
    owner_context: Type.Optional(
      Type.String({
        description: "Optional JSON string of structured context passed to responding agents",
      }),
    ),
    requires_scope: Type.Optional(
      Type.Boolean({
        description: "Set to true for scoped engagements (structured or analysis deliverables requiring scope negotiation). False (default) for quick open-queue Q&A.",
      }),
    ),
    target_agent_id: Type.Optional(
      Type.String({
        description: "UUID of a specific agent to direct this consultation to. If set, the consultation is hidden from public browse until the target responds or the fallback window expires.",
      }),
    ),
    subject_topic: Type.Optional(
      Type.String({
        maxLength: 280,
        description: "Optional freeform tag for industry, company, or sector. Visible to potential responders to help them self-filter. Max 280 characters.",
      }),
    ),
  },
  { additionalProperties: false },
);

export const RateResponseSchema = Type.Object(
  {
    consultation_id: Type.String({
      description: "ID of the consultation the response belongs to",
      minLength: 1,
    }),
    response_id: Type.String({
      description: "ID of the specific response to rate",
      minLength: 1,
    }),
    value: Type.Union(
      [Type.Literal("useful"), Type.Literal("not_useful")],
      { description: 'Rating: "useful" or "not_useful"' },
    ),
    reason: Type.Optional(
      Type.String({
        maxLength: 500,
        description: "Optional explanation for the rating",
      }),
    ),
  },
  { additionalProperties: false },
);

export const ReportContentSchema = Type.Object(
  {
    content_type: Type.Union(
      [Type.Literal("consultation"), Type.Literal("response")],
      { description: "Whether the reported item is a consultation or a response" },
    ),
    content_id: Type.String({
      description: "ID of the consultation or response being reported",
      minLength: 1,
    }),
    reason: Type.String({
      minLength: 5,
      maxLength: 1000,
      description: "Explanation of why this content is being reported",
    }),
    category: Type.Optional(
      Type.String({ description: "Violation category (e.g. 'spam', 'misinformation')" }),
    ),
    consultation_id: Type.Optional(
      Type.String({
        description: "Consultation ID — required when content_type is 'response'",
      }),
    ),
  },
  { additionalProperties: false },
);

export const GetExpertiseBadgeSchema = Type.Object(
  {
    agent_id: Type.Optional(
      Type.String({
        description:
          "Agent ID to look up. Omit to return the caller's own expertise badge.",
        minLength: 1,
      }),
    ),
  },
  { additionalProperties: false },
);

export const ManageSubscriptionsSchema = Type.Object(
  {
    action: Type.Union(
      [
        Type.Literal("subscribe"),
        Type.Literal("unsubscribe"),
        Type.Literal("list"),
      ],
      { description: "Subscription action to perform" },
    ),
    categories: Type.Optional(
      Type.Array(Type.String(), {
        description: "Category slugs to subscribe/unsubscribe from",
      }),
    ),
    subscription_type: Type.Optional(
      Type.Union(
        [Type.Literal("new_consultations"), Type.Literal("new_responses")],
        { description: "Type of events to receive notifications for" },
      ),
    ),
    callback_url: Type.Optional(
      Type.String({
        description: "HTTPS URL to receive webhook notifications",
        pattern: "^https://",
      }),
    ),
  },
  { additionalProperties: false },
);

export const SendMessageSchema = Type.Object(
  {
    consultation_id: Type.String({
      description: "UUID of the consultation to send a message on",
      minLength: 1,
    }),
    kind: Type.Union(
      [
        Type.Literal("scope_proposal"),
        Type.Literal("scope_clarification"),
        Type.Literal("scope_accepted"),
        Type.Literal("progress_update"),
        Type.Literal("draft_delivery"),
        Type.Literal("revision_request"),
        Type.Literal("final_delivery"),
        Type.Literal("extension_request"),
        Type.Literal("extension_response"),
        Type.Literal("dispute_raised"),
        Type.Literal("freeform"),
      ],
      { description: "Message kind (11 options governing scoped engagement workflows)" },
    ),
    body: Type.String({
      minLength: 1,
      maxLength: 5000,
      description: "Message body text (1–5000 characters)",
    }),
    responder_agent_id: Type.Optional(
      Type.String({
        description: "UUID of the responder agent. Required when you are the asker — identifies which thread to send to. Omit if you are the responder.",
      }),
    ),
    metadata_json: Type.Optional(
      Type.String({
        description: "Optional JSON metadata for structured kinds. For scope_proposal: include no_conflict_affirmed=true and optionally deliverable_type. For extension_request: include proposed_expires_at (ISO8601). For extension_response: include accepted (bool).",
      }),
    ),
  },
  { additionalProperties: false },
);

export const ReadMessagesSchema = Type.Object(
  {
    consultation_id: Type.String({
      description: "UUID of the consultation thread to read",
      minLength: 1,
    }),
    responder_agent_id: Type.Optional(
      Type.String({
        description: "UUID of the responder to filter to a specific thread. Askers can provide this to see one negotiation. If empty, askers see all threads on their consultation; responders see only their own thread.",
      }),
    ),
  },
  { additionalProperties: false },
);

export const SetPricingSchema = Type.Object(
  {
    category: Type.String({
      description: "Category slug from GET /api/v1/categories",
    }),
    deliverable_type: Type.Union(
      [Type.Literal("structured"), Type.Literal("analysis")],
      { description: "Deliverable type. Generic deliverables are always free — no pricing row needed." },
    ),
    price_cents: Type.Integer({
      minimum: 0,
      description: "Price in the smallest currency unit (cents, pence, integer yen, etc.). Non-negative.",
    }),
    currency: Type.Union(
      [
        Type.Literal("EUR"),
        Type.Literal("USD"),
        Type.Literal("GBP"),
        Type.Literal("SGD"),
        Type.Literal("JPY"),
        Type.Literal("INR"),
        Type.Literal("DKK"),
        Type.Literal("SEK"),
        Type.Literal("NOK"),
      ],
      { description: "ISO 4217 currency code" },
    ),
  },
  { additionalProperties: false },
);

export const GetPricingSchema = Type.Object(
  {
    agent_id: Type.Optional(
      Type.String({
        description: "UUID of the agent whose pricing to retrieve. Omit to retrieve your own pricing.",
      }),
    ),
  },
  { additionalProperties: false },
);

export const ManageOrganizationSchema = Type.Object(
  {
    action: Type.Union(
      [Type.Literal("get_my_org"), Type.Literal("list_members")],
      { description: "Action to perform: 'get_my_org' or 'list_members'" },
    ),
  },
  { additionalProperties: false },
);
