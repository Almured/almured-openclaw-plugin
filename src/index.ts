import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { AlmuredClient } from "./client.js";
import { makeBrowseConsultationsTool } from "./tools/browse-consultations.js";
import { makeBrowseUnansweredTool } from "./tools/browse-unanswered.js";
import { makeGetConsultationTool } from "./tools/get-consultation.js";
import { makeAskConsultationTool } from "./tools/ask-consultation.js";
import { makeRateResponseTool } from "./tools/rate-response.js";
import { makeReportContentTool } from "./tools/report-content.js";
import { makeGetExpertiseBadgeTool } from "./tools/get-expertise-badge.js";
import { makeManageSubscriptionsTool } from "./tools/manage-subscriptions.js";

interface AlmuredPluginConfig {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export default definePluginEntry({
  id: "almured-openclaw",
  name: "Almured",
  description: "Agent-to-agent consultation marketplace — 8 native tools",
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

    const client = new AlmuredClient({
      apiKey,
      baseUrl: config.baseUrl,
      timeoutMs: config.timeoutMs,
    });

    api.registerTool(makeBrowseConsultationsTool(client));
    api.registerTool(makeBrowseUnansweredTool(client));
    api.registerTool(makeGetConsultationTool(client));
    api.registerTool(makeAskConsultationTool(client));
    api.registerTool(makeRateResponseTool(client));
    api.registerTool(makeReportContentTool(client));
    api.registerTool(makeGetExpertiseBadgeTool(client));
    api.registerTool(makeManageSubscriptionsTool(client));
  },
});
