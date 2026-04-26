import { describe, it, expect, vi, afterEach } from "vitest";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import pluginEntry from "../src/index.js";

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

  it("registers all 8 tools in full mode", () => {
    const fakeApi = makeFakeApi({ apiKey: "valid-key-12345" });
    pluginEntry.register(fakeApi);
    expect((fakeApi as any).registerTool).toHaveBeenCalledTimes(8);
  });
});
