import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkConfigFilePerms,
  resolveDefaultConfigPath,
} from "../src/file-perms.js";

describe.skipIf(process.platform === "win32")("checkConfigFilePerms (unix)", () => {
  let dir: string;
  let path: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "almured-perms-"));
    path = join(dir, "openclaw.json");
    writeFileSync(path, "{}");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("0o600 (owner only) emits no warning", () => {
    chmodSync(path, 0o600);
    const log = vi.fn();
    checkConfigFilePerms(path, log);
    expect(log).not.toHaveBeenCalled();
  });

  it("0o400 (owner read only) emits no warning", () => {
    chmodSync(path, 0o400);
    const log = vi.fn();
    checkConfigFilePerms(path, log);
    expect(log).not.toHaveBeenCalled();
  });

  it("0o644 (world readable) emits a warning containing '644', the path, and 'chmod 0600'", () => {
    chmodSync(path, 0o644);
    const log = vi.fn();
    checkConfigFilePerms(path, log);
    expect(log).toHaveBeenCalledTimes(1);
    const msg = (log.mock.calls[0] as string[])[0];
    expect(msg).toContain("644");
    expect(msg).toContain(path);
    expect(msg).toContain("chmod 0600");
  });

  it("0o640 (group readable, world no) emits a warning containing '640'", () => {
    chmodSync(path, 0o640);
    const log = vi.fn();
    checkConfigFilePerms(path, log);
    expect(log).toHaveBeenCalledTimes(1);
    expect((log.mock.calls[0] as string[])[0]).toContain("640");
  });

  it("0o660 (group rw) emits a warning", () => {
    chmodSync(path, 0o660);
    const log = vi.fn();
    checkConfigFilePerms(path, log);
    expect(log).toHaveBeenCalledTimes(1);
  });

  it("undefined path with no auto-detected file emits no warn (debug only)", () => {
    // Isolate HOME so auto-detect cannot accidentally resolve to a real file
    // on the test machine. The behavior we're pinning: no `warn` ever fires
    // when the resolved file doesn't exist.
    const savedHome = process.env.HOME;
    process.env.HOME = dir; // empty tmpdir — no .openclaw/openclaw.json
    try {
      const log = vi.fn();
      checkConfigFilePerms(undefined, log);
      expect(log).not.toHaveBeenCalled();
    } finally {
      if (savedHome === undefined) delete process.env.HOME;
      else process.env.HOME = savedHome;
    }
  });

  it("empty-string path with no auto-detected file emits no warn (debug only)", () => {
    const savedHome = process.env.HOME;
    process.env.HOME = dir;
    try {
      const log = vi.fn();
      checkConfigFilePerms("", log);
      expect(log).not.toHaveBeenCalled();
    } finally {
      if (savedHome === undefined) delete process.env.HOME;
      else process.env.HOME = savedHome;
    }
  });

  it("nonexistent path is a no-op (no throw, no log)", () => {
    const log = vi.fn();
    expect(() => checkConfigFilePerms(join(dir, "does-not-exist.json"), log)).not.toThrow();
    expect(log).not.toHaveBeenCalled();
  });
});

describe("checkConfigFilePerms — platform short-circuit", () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  it("returns silently on win32 even with a permissive real file", () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    const log = vi.fn();
    // Pass a path that may or may not exist — irrelevant; we should bail before stat.
    checkConfigFilePerms("/tmp/anywhere", log);
    expect(log).not.toHaveBeenCalled();
  });
});

describe("resolveDefaultConfigPath — platform-aware auto-detect (v0.5.4)", () => {
  const originalPlatform = process.platform;
  const originalHome = process.env.HOME;
  const originalAppData = process.env.APPDATA;

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    if (originalAppData === undefined) delete process.env.APPDATA;
    else process.env.APPDATA = originalAppData;
  });

  it("resolves Unix path (~/.openclaw/openclaw.json) on non-win32", () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    process.env.HOME = "/home/agent";
    expect(resolveDefaultConfigPath()).toBe("/home/agent/.openclaw/openclaw.json");
  });

  it("resolves Windows path (%APPDATA%\\openclaw\\openclaw.json) on win32", () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    process.env.APPDATA = "C:\\Users\\Agent\\AppData\\Roaming";
    const p = resolveDefaultConfigPath();
    expect(p).toBeDefined();
    expect(p!).toContain("openclaw");
    expect(p!.endsWith("openclaw.json")).toBe(true);
  });

  it("returns undefined on win32 when APPDATA is unset", () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    delete process.env.APPDATA;
    expect(resolveDefaultConfigPath()).toBeUndefined();
  });
});

describe.skipIf(process.platform === "win32")(
  "checkConfigFilePerms — auto-detect fallback (v0.5.4)",
  () => {
    let dir: string;
    let openclawDir: string;
    let path: string;
    const originalHome = process.env.HOME;

    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), "almured-autodetect-"));
      openclawDir = join(dir, ".openclaw");
      // Create the `.openclaw` subdir manually so the resolved path lines up.
      writeFileSync(join(dir, ".keep"), "");
      // Use mkdirSync via fs (avoid extra import — write to nested file).
    });

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
      if (originalHome === undefined) delete process.env.HOME;
      else process.env.HOME = originalHome;
    });

    it("warns on a permissive auto-detected file when path is omitted", async () => {
      const { mkdirSync } = await import("node:fs");
      mkdirSync(openclawDir, { recursive: true });
      path = join(openclawDir, "openclaw.json");
      writeFileSync(path, "{}");
      chmodSync(path, 0o644);
      process.env.HOME = dir;

      const log = vi.fn();
      const debugLog = vi.fn();
      // Pass undefined → triggers auto-detect via $HOME.
      checkConfigFilePerms(undefined, log, debugLog);
      expect(log).toHaveBeenCalledTimes(1);
      expect((log.mock.calls[0] as string[])[0]).toContain(path);
    });

    it("auto-detect with no file present → debug log, no warning", () => {
      // HOME points at a fresh dir with no .openclaw subdir.
      process.env.HOME = dir;
      const log = vi.fn();
      const debugLog = vi.fn();
      checkConfigFilePerms(undefined, log, debugLog);
      expect(log).not.toHaveBeenCalled();
      // Debug message names the resolved path so verbose runs can trace.
      expect(debugLog).toHaveBeenCalledTimes(1);
      expect((debugLog.mock.calls[0] as string[])[0]).toMatch(/skipping permission check/);
    });

    it("explicit path argument overrides auto-detect", async () => {
      const { mkdirSync } = await import("node:fs");
      mkdirSync(openclawDir, { recursive: true });
      const altPath = join(dir, "explicit.json");
      writeFileSync(altPath, "{}");
      chmodSync(altPath, 0o644);
      // Point HOME elsewhere; explicit `altPath` should still be checked.
      process.env.HOME = "/nonexistent-home";

      const log = vi.fn();
      checkConfigFilePerms(altPath, log);
      expect(log).toHaveBeenCalledTimes(1);
      expect((log.mock.calls[0] as string[])[0]).toContain(altPath);
    });
  },
);
