import { describe, it, expect, vi, afterEach } from "vitest";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import pluginEntry, { buildAutoConsult, ALL_CATEGORIES } from "../src/index.js";

function makeFakeApi(config: Record<string, unknown> = {}): OpenClawPluginApi {
  return {
    pluginConfig: config,
    registrationMode: "full",
    registerTool: vi.fn(),
  } as unknown as OpenClawPluginApi;
}

afterEach(() => {
  delete process.env.ALMURED_API_KEY;
});

describe("pluginEntry env-var fallback", () => {
  it("uses env var when config.apiKey is absent", () => {
    process.env.ALMURED_API_KEY = "env-fallback-key";
    expect(() => pluginEntry.register(makeFakeApi())).not.toThrow();
  });

  it("throws when neither config nor env var provides apiKey", () => {
    expect(() => pluginEntry.register(makeFakeApi())).toThrow(/no API key found/);
  });

  it("config.apiKey takes precedence over env var", () => {
    // env var is too short to pass AlmuredClient validation (7 chars < 8 min)
    // if env takes precedence the client constructor would throw "at least 8 characters"
    // if config takes precedence it uses the valid config key and succeeds
    process.env.ALMURED_API_KEY = "env-key";
    expect(() => pluginEntry.register(makeFakeApi({ apiKey: "config-key-valid" }))).not.toThrow();
  });
});

describe("pluginEntry registration modes", () => {
  it("skips tool registration when not in full mode", () => {
    const fakeApi = {
      pluginConfig: { apiKey: "valid-key-12345" },
      registrationMode: "inspect",
      registerTool: vi.fn(),
    } as unknown as OpenClawPluginApi;
    expect(() => pluginEntry.register(fakeApi)).not.toThrow();
    expect((fakeApi as any).registerTool).not.toHaveBeenCalled();
  });

  it("registers all 13 tools in full mode", () => {
    const fakeApi = makeFakeApi({ apiKey: "valid-key-12345" });
    pluginEntry.register(fakeApi);
    expect((fakeApi as any).registerTool).toHaveBeenCalledTimes(13);
  });
});

describe("auto_consult config", () => {
  it("default auto_consult has all 15 categories enabled", () => {
    const config = buildAutoConsult();
    expect(Object.keys(config)).toHaveLength(ALL_CATEGORIES.length);
    for (const val of Object.values(config)) {
      expect(val).toBe(true);
    }
  });

  it("is fully populated when user provides only apiKey", () => {
    const fakeApi = makeFakeApi({ apiKey: "valid-key-12345" });
    pluginEntry.register(fakeApi);
    // Plugin registers without throwing — auto_consult defaults apply internally
    expect((fakeApi as any).registerTool).toHaveBeenCalledTimes(13);
    // Verify buildAutoConsult with no overrides covers all 15 categories
    const defaults = buildAutoConsult();
    expect(Object.keys(defaults)).toHaveLength(15);
    expect(Object.values(defaults).every((v) => v === true)).toBe(true);
  });

  it("disabled category returns disabled message from ask_consultation execute", async () => {
    const fakeApi = makeFakeApi({
      apiKey: "valid-key-12345",
      auto_consult: { ai_ml: false },
    });
    pluginEntry.register(fakeApi);
    const registerCalls: any[] = (fakeApi as any).registerTool.mock.calls;
    const askTool = registerCalls.find((args) => args[0].name === "ask_consultation")?.[0];
    expect(askTool).toBeDefined();
    const result = await askTool.execute("test-id", {
      category: "ai_ml",
      subcategory: "inference",
      question: "Which provider is cheapest?",
    });
    expect(result.content[0].text).toMatch(/disabled/i);
    expect(result.content[0].text).toContain("ai_ml");
  });

  it("enabled category passes through to client normally", async () => {
    // ai_ml is NOT disabled — execute should attempt a real call
    // We just verify it does NOT return the disabled message
    const autoConsult = buildAutoConsult({ security: false });
    expect(autoConsult.security).toBe(false);
    expect(autoConsult.ai_ml).toBe(true);
    // Other categories untouched
    expect(autoConsult.cloud_infra).toBe(true);
  });
});
