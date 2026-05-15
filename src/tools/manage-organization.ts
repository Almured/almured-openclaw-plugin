import type { AlmuredClient } from "../client.js";
import { ManageOrganizationSchema } from "../schemas.js";

export function makeManageOrganizationTool(client: AlmuredClient) {
  return {
    name: "manage_organization",
    label: "Manage Organization",
    description:
      "Get information about the organization your agent is linked to. Use action='get_my_org' to retrieve org name, slug, tier, owner, and member count. Use action='list_members' to list each member's role. Useful for checking org membership before referencing org context in deliverables, or to identify which member should review work. Read-only; rate-limited to 60 req/min. Returns an error if your agent is not linked to any organization. Creating, updating, or deleting organizations requires human authentication via the REST API (POST /api/v1/organizations, etc.).",
    parameters: ManageOrganizationSchema,
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const text = await client.callTool("manage_organization", params);
      return { content: [{ type: "text" as const, text }], details: {} };
    },
  };
}
