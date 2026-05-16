import { describe, it, expect, vi, afterEach } from "vitest";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import pluginEntry, {
  buildAutoConsult,
  ALL_CATEGORIES,
  allowedTools,
} from "../src/index.js";

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

  it("default (no mode field) registers 11 standard-mode tools (v0.5.4 changed default to 'standard')", () => {
    const fakeApi = makeFakeApi({ apiKey: "valid-key-12345" });
    pluginEntry.register(fakeApi);
    expect((fakeApi as any).registerTool).toHaveBeenCalledTimes(11);
    const names = (fakeApi as any).registerTool.mock.calls.map((c: any[]) => c[0].name);
    expect(names).not.toContain("set_pricing");
    expect(names).not.toContain("manage_organization");
  });

  it("default-mode load emits an INFO log naming the chosen mode and the opt-in path", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      const fakeApi = makeFakeApi({ apiKey: "valid-key-12345" });
      pluginEntry.register(fakeApi);
      expect(infoSpy).toHaveBeenCalledTimes(1);
      const msg = infoSpy.mock.calls[0][0] as string;
      expect(msg).toContain("'standard' mode (default)");
      expect(msg).toContain("config.mode='full'");
    } finally {
      infoSpy.mockRestore();
    }
  });

  it("explicit mode does NOT emit the default-mode INFO log", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      const fakeApi = makeFakeApi({ apiKey: "valid-key-12345", mode: "full" });
      pluginEntry.register(fakeApi);
      expect(infoSpy).not.toHaveBeenCalled();
    } finally {
      infoSpy.mockRestore();
    }
  });
});

describe("allowedTools — per-mode contract", () => {
  it("readonly mode contains exactly 6 tools", () => {
    const s = allowedTools("readonly");
    expect(s.size).toBe(6);
    expect([...s].sort()).toEqual([
      "browse_consultations",
      "browse_unanswered",
      "get_consultation",
      "get_expertise_badge",
      "get_pricing",
      "read_messages",
    ]);
  });

  it("standard mode contains exactly 11 tools and is a superset of readonly", () => {
    const s = allowedTools("standard");
    expect(s.size).toBe(11);
    for (const t of allowedTools("readonly")) {
      expect(s.has(t)).toBe(true);
    }
    expect(s.has("ask_consultation")).toBe(true);
    expect(s.has("send_message")).toBe(true);
    expect(s.has("rate_response")).toBe(true);
    expect(s.has("report_content")).toBe(true);
    expect(s.has("manage_subscriptions")).toBe(true);
    expect(s.has("set_pricing")).toBe(false);
    expect(s.has("manage_organization")).toBe(false);
  });

  it("full mode contains all 13 tools", () => {
    const s = allowedTools("full");
    expect(s.size).toBe(13);
    expect(s.has("set_pricing")).toBe(true);
    expect(s.has("manage_organization")).toBe(true);
  });
});

describe("pluginEntry — mode gating during registration", () => {
  it("readonly registers exactly 6 tools, none of them write tools", () => {
    const fakeApi = makeFakeApi({ apiKey: "valid-key-12345", mode: "readonly" });
    pluginEntry.register(fakeApi);
    const registerMock = (fakeApi as any).registerTool;
    expect(registerMock).toHaveBeenCalledTimes(6);
    const names = registerMock.mock.calls.map((c: any[]) => c[0].name);
    expect(names).not.toContain("ask_consultation");
    expect(names).not.toContain("send_message");
    expect(names).not.toContain("set_pricing");
  });

  it("standard registers exactly 11 tools", () => {
    const fakeApi = makeFakeApi({ apiKey: "valid-key-12345", mode: "standard" });
    pluginEntry.register(fakeApi);
    const registerMock = (fakeApi as any).registerTool;
    expect(registerMock).toHaveBeenCalledTimes(11);
    const names = registerMock.mock.calls.map((c: any[]) => c[0].name);
    expect(names).toContain("ask_consultation");
    expect(names).not.toContain("set_pricing");
    expect(names).not.toContain("manage_organization");
  });

  it("full registers all 13 tools", () => {
    const fakeApi = makeFakeApi({ apiKey: "valid-key-12345", mode: "full" });
    pluginEntry.register(fakeApi);
    expect((fakeApi as any).registerTool).toHaveBeenCalledTimes(13);
  });

  it("unknown mode value throws (no silent fallback)", () => {
    const fakeApi = makeFakeApi({ apiKey: "valid-key-12345", mode: "bogus" });
    expect(() => pluginEntry.register(fakeApi)).toThrow(/invalid config\.mode/);
    expect(() => pluginEntry.register(fakeApi)).toThrow(/'readonly', 'standard', 'full'/);
    expect((fakeApi as any).registerTool).not.toHaveBeenCalled();
  });

  it("undefined mode defaults to STANDARD (11 tools — BREAKING in v0.5.4)", () => {
    const fakeApi = makeFakeApi({ apiKey: "valid-key-12345" }); // no mode field
    expect(() => pluginEntry.register(fakeApi)).not.toThrow();
    expect((fakeApi as any).registerTool).toHaveBeenCalledTimes(11);
  });

  it("explicit null mode defaults to STANDARD (treated as 'omitted')", () => {
    const fakeApi = makeFakeApi({ apiKey: "valid-key-12345", mode: null });
    expect(() => pluginEntry.register(fakeApi)).not.toThrow();
    expect((fakeApi as any).registerTool).toHaveBeenCalledTimes(11);
  });

  it("explicit mode='full' still registers all 13 tools (opt-in path preserved)", () => {
    const fakeApi = makeFakeApi({ apiKey: "valid-key-12345", mode: "full" });
    pluginEntry.register(fakeApi);
    expect((fakeApi as any).registerTool).toHaveBeenCalledTimes(13);
    const names = (fakeApi as any).registerTool.mock.calls.map((c: any[]) => c[0].name);
    expect(names).toContain("set_pricing");
    expect(names).toContain("manage_organization");
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
    // Default mode is 'standard' as of v0.5.4 → 11 tools registered.
    expect((fakeApi as any).registerTool).toHaveBeenCalledTimes(11);
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

  it("enabled category passes through to client normally", () => {
    const autoConsult = buildAutoConsult({ security: false });
    expect(autoConsult.security).toBe(false);
    expect(autoConsult.ai_ml).toBe(true);
    expect(autoConsult.cloud_infra).toBe(true);
  });
});
