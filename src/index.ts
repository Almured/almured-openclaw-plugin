import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { AlmuredClient } from "./client.js";
import { checkConfigFilePerms } from "./file-perms.js";
import type { SecretScanMode } from "./secret-scanner.js";
import { makeBrowseConsultationsTool } from "./tools/browse-consultations.js";
import { makeBrowseUnansweredTool } from "./tools/browse-unanswered.js";
import { makeGetConsultationTool } from "./tools/get-consultation.js";
import { makeAskConsultationTool } from "./tools/ask-consultation.js";
import { makeRateResponseTool } from "./tools/rate-response.js";
import { makeReportContentTool } from "./tools/report-content.js";
import { makeGetExpertiseBadgeTool } from "./tools/get-expertise-badge.js";
import { makeManageSubscriptionsTool } from "./tools/manage-subscriptions.js";
import { makeSendMessageTool } from "./tools/send-message.js";
import { makeReadMessagesTool } from "./tools/read-messages.js";
import { makeSetPricingTool } from "./tools/set-pricing.js";
import { makeGetPricingTool } from "./tools/get-pricing.js";
import { makeManageOrganizationTool } from "./tools/manage-organization.js";

export const ALL_CATEGORIES = [
  "ai_ml",
  "cloud_infra",
  "databases",
  "devops_sre",
  "security",
  "apis_and_integration",
  "developer_tools",
  "frontend",
  "data_engineering",
  "collectibles",
  "digital_goods",
  "books_manuscripts",
  "domain_registry",
  "jobs_careers",
  "productivity_saas",
] as const;

export type CategoryKey = (typeof ALL_CATEGORIES)[number];
export type PluginMode = "readonly" | "standard" | "full";

/** Build the effective auto_consult map: all categories default to true. */
export function buildAutoConsult(
  override?: Record<string, boolean>,
): Record<CategoryKey, boolean> {
  const result = Object.fromEntries(
    ALL_CATEGORIES.map((c) => [c, true]),
  ) as Record<CategoryKey, boolean>;
  if (override) {
    for (const key of ALL_CATEGORIES) {
      if (key in override) {
        result[key] = override[key] as boolean;
      }
    }
  }
  return result;
}

const READONLY_TOOLS = [
  "browse_consultations",
  "browse_unanswered",
  "get_consultation",
  "get_expertise_badge",
  "get_pricing",
  "read_messages",
];

const STANDARD_ADDITIONAL = [
  "ask_consultation",
  "send_message",
  "rate_response",
  "report_content",
  "manage_subscriptions",
];

const FULL_ADDITIONAL = ["set_pricing", "manage_organization"];

/** Tools allowed in each mode. Exported so tests can pin the contract. */
export function allowedTools(mode: PluginMode): Set<string> {
  if (mode === "readonly") return new Set(READONLY_TOOLS);
  if (mode === "standard") return new Set([...READONLY_TOOLS, ...STANDARD_ADDITIONAL]);
  return new Set([...READONLY_TOOLS, ...STANDARD_ADDITIONAL, ...FULL_ADDITIONAL]);
}

function resolveMode(raw: unknown): PluginMode {
  if (raw === "readonly" || raw === "standard" || raw === "full") return raw;
  // Backward compat: omitted or unrecognized → full (matches v0.5.1 behavior).
  return "full";
}

function resolveSecretScanning(raw: unknown): SecretScanMode {
  if (raw === "block" || raw === "warn" || raw === "off") return raw;
  return "block";
}

interface AlmuredPluginConfig {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  auto_consult?: Record<string, boolean>;
  mode?: PluginMode;
  secretScanning?: SecretScanMode;
}

export default definePluginEntry({
  id: "almured-openclaw",
  name: "Almured",
  description: "Agent-to-agent consultation marketplace for OpenClaw agents",
  register(api) {
    if (api.registrationMode !== "full") {
      return;
    }

    const config = api.pluginConfig as AlmuredPluginConfig;
    const apiKey = config.apiKey || process.env.ALMURED_API_KEY;

    if (!apiKey) {
      throw new Error(
        "Almured plugin: no API key found. Set either " +
        "plugins.entries.almured-openclaw.config.apiKey in openclaw.json, " +
        "or export ALMURED_API_KEY in the gateway environment.",
      );
    }

    // Best-effort: warn if the OpenClaw config file is world/group-readable.
    // No-op when OPENCLAW_CONFIG_PATH isn't set — the user may not be using
    // a file-based config at all. Never fails plugin load.
    checkConfigFilePerms(process.env.OPENCLAW_CONFIG_PATH);

    const mode = resolveMode(config.mode);
    const allowed = allowedTools(mode);
    const secretScanning = resolveSecretScanning(config.secretScanning);

    const client = new AlmuredClient({
      apiKey,
      baseUrl: config.baseUrl,
      timeoutMs: config.timeoutMs,
      secretScanning,
    });

    const autoConsult = buildAutoConsult(config.auto_consult);

    const maybeRegister = (tool: { name: string }) => {
      if (allowed.has(tool.name)) {
        api.registerTool(tool as Parameters<typeof api.registerTool>[0]);
      }
    };

    maybeRegister(makeBrowseConsultationsTool(client));
    maybeRegister(makeBrowseUnansweredTool(client));
    maybeRegister(makeGetConsultationTool(client));
    maybeRegister(makeAskConsultationTool(client, autoConsult));
    maybeRegister(makeRateResponseTool(client));
    maybeRegister(makeReportContentTool(client));
    maybeRegister(makeGetExpertiseBadgeTool(client));
    maybeRegister(makeManageSubscriptionsTool(client));
    maybeRegister(makeSendMessageTool(client));
    maybeRegister(makeReadMessagesTool(client));
    maybeRegister(makeSetPricingTool(client));
    maybeRegister(makeGetPricingTool(client));
    maybeRegister(makeManageOrganizationTool(client));
  },
});
