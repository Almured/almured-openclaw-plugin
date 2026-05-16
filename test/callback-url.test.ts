import { describe, it, expect } from "vitest";
import { assertSafeCallbackUrl } from "../src/callback-url.js";

describe("assertSafeCallbackUrl — accepts safe public HTTPS URLs", () => {
  const accepts = [
    "https://example.com/webhook",
    "https://api.example.com:8443/almured/events",
    "https://hooks.example.io/v2/incoming?token=abc",
    "https://203.0.113.10/webhook", // TEST-NET-3 (public-routable for tests; not in any reserved range we block)
  ];
  for (const url of accepts) {
    it(`accepts ${url}`, () => {
      expect(() => assertSafeCallbackUrl(url)).not.toThrow();
    });
  }
});

describe("assertSafeCallbackUrl — rejects non-HTTPS schemes", () => {
  const cases: Array<[string, RegExp]> = [
    ["http://example.com/webhook", /scheme 'http' is not allowed/],
    ["ws://example.com/socket", /scheme 'ws'/],
    ["wss://example.com/socket", /scheme 'wss'/],
    ["file:///etc/passwd", /scheme 'file'/],
    ["ftp://example.com/", /scheme 'ftp'/],
    ["gopher://example.com/", /scheme 'gopher'/],
  ];
  for (const [url, pattern] of cases) {
    it(`rejects ${url}`, () => {
      expect(() => assertSafeCallbackUrl(url)).toThrow(pattern);
    });
  }
});

describe("assertSafeCallbackUrl — rejects loopback hosts", () => {
  const loopback = [
    "https://localhost/webhook",
    "https://localhost:8080/cb",
    "https://service.localhost/cb",
    "https://127.0.0.1/cb",
    "https://127.0.0.1:443/cb",
    "https://127.1.2.3/cb", // anything in 127/8
    "https://[::1]/cb", // IPv6 loopback
  ];
  for (const url of loopback) {
    it(`rejects ${url}`, () => {
      expect(() => assertSafeCallbackUrl(url)).toThrow(/loopback/);
    });
  }
});

describe("assertSafeCallbackUrl — rejects RFC1918 private ranges", () => {
  const privateAddrs = [
    "https://10.0.0.1/cb", // 10/8
    "https://10.255.255.255/cb",
    "https://172.16.0.1/cb", // 172.16/12 low
    "https://172.31.255.254/cb", // 172.16/12 high
    "https://192.168.1.1/cb", // 192.168/16
    "https://192.168.0.0/cb",
  ];
  for (const url of privateAddrs) {
    it(`rejects ${url}`, () => {
      expect(() => assertSafeCallbackUrl(url)).toThrow(/RFC1918/);
    });
  }

  it("does NOT reject 172.15.x.x (just below 172.16/12)", () => {
    expect(() => assertSafeCallbackUrl("https://172.15.1.1/cb")).not.toThrow();
  });

  it("does NOT reject 172.32.x.x (just above 172.16/12)", () => {
    expect(() => assertSafeCallbackUrl("https://172.32.1.1/cb")).not.toThrow();
  });
});

describe("assertSafeCallbackUrl — rejects link-local (cloud metadata)", () => {
  it("rejects 169.254.169.254 (AWS / Azure / GCP metadata endpoint)", () => {
    expect(() => assertSafeCallbackUrl("https://169.254.169.254/latest/meta-data/")).toThrow(
      /link-local/,
    );
  });
  it("rejects anything in 169.254/16", () => {
    expect(() => assertSafeCallbackUrl("https://169.254.0.1/cb")).toThrow(/link-local/);
  });
});

describe("assertSafeCallbackUrl — rejects reserved internal TLDs", () => {
  const internal = [
    "https://service.local/cb",
    "https://api.local/cb",
    "https://service.internal/cb",
    "https://billing.intranet/cb",
  ];
  for (const url of internal) {
    it(`rejects ${url}`, () => {
      expect(() => assertSafeCallbackUrl(url)).toThrow(/reserved internal TLD/);
    });
  }
});

describe("assertSafeCallbackUrl — rejects 0.0.0.0/8", () => {
  it("rejects 0.0.0.0", () => {
    expect(() => assertSafeCallbackUrl("https://0.0.0.0/cb")).toThrow(/0\.0\.0\.0\/8/);
  });
});

describe("assertSafeCallbackUrl — rejects malformed inputs", () => {
  it("rejects empty string", () => {
    expect(() => assertSafeCallbackUrl("")).toThrow(/not a valid URL/);
  });
  it("rejects junk that isn't a URL", () => {
    expect(() => assertSafeCallbackUrl("not a url at all")).toThrow(/not a valid URL/);
  });
});
