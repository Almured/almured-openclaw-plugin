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
    value: Type.Integer({
      minimum: 1,
      maximum: 5,
      description: "Rating score from 1 (poor) to 5 (excellent)",
    }),
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
