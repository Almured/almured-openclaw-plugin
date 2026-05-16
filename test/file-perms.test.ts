import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkConfigFilePerms } from "../src/file-perms.js";

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

  it("undefined path is a no-op", () => {
    const log = vi.fn();
    checkConfigFilePerms(undefined, log);
    expect(log).not.toHaveBeenCalled();
  });

  it("empty-string path is a no-op", () => {
    const log = vi.fn();
    checkConfigFilePerms("", log);
    expect(log).not.toHaveBeenCalled();
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
