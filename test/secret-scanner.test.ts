import { describe, it, expect } from "vitest";
import { scanForSecrets } from "../src/secret-scanner.js";

describe("scanForSecrets — positive detection", () => {
  it("detects an AWS access key", () => {
    const matches = scanForSecrets("creds: AKIAIOSFODNN7EXAMPLE");
    expect(matches.map((m) => m.pattern)).toContain("aws_access_key");
    const aws = matches.find((m) => m.pattern === "aws_access_key")!;
    expect(aws.preview).toBe("AKIAIO***");
    expect(aws.index).toBe(7);
  });

  it("detects a GitHub PAT (ghp_)", () => {
    const text = "token=ghp_TESTONLYNOTAREALTOKENXXXXXXXXXXXX0000";
    const matches = scanForSecrets(text);
    const pat = matches.find((m) => m.pattern === "github_pat");
    expect(pat).toBeDefined();
    expect(pat!.preview).toBe("ghp_TE***");
  });

  it("detects a GitHub OAuth token (gho_)", () => {
    const text = "auth gho_TESTONLYNOTAREALTOKENXXXXXXXXXXXX0000";
    const matches = scanForSecrets(text);
    expect(matches.some((m) => m.pattern === "github_oauth")).toBe(true);
  });

  it("detects a Stripe key (test prefix, branch 1)", () => {
    // Synthetic test fixture — sk_test_ sandbox prefix, all-zero / repeated tail.
    // Validates the Stripe-pattern regex without resembling a real key. GitHub
    // push protection accepts sk_test_ sandbox prefixes at low severity.
    const text = "stripe sk_test_TESTONLYNOTAREALKEY000000";
    const matches = scanForSecrets(text);
    const sk = matches.find((m) => m.pattern === "stripe_key");
    expect(sk).toBeDefined();
    expect(sk!.preview).toBe("sk_tes***");
  });

  it("detects a Stripe key (test prefix, branch 2 — distinct tail)", () => {
    // Second synthetic fixture, again sk_test_ + low-entropy tail; differs only
    // in the alphanumeric suffix so it exercises the regex independently.
    const text = "key=sk_test_FAKEKEYFAKEKEYFAKEKEYFAKE";
    const matches = scanForSecrets(text);
    expect(matches.some((m) => m.pattern === "stripe_key")).toBe(true);
  });

  it("detects an Anthropic key", () => {
    const text = "ANTHROPIC=sk-ant-TESTONLYNOTAREALKEY00000000000000";
    const matches = scanForSecrets(text);
    const a = matches.find((m) => m.pattern === "anthropic_key");
    expect(a).toBeDefined();
    expect(a!.preview).toBe("sk-ant***");
  });

  it("detects an OpenAI key (exactly 48 alphanumeric chars after sk-)", () => {
    const tail = "A".repeat(48);
    const text = `OPENAI_KEY=sk-${tail}`;
    const matches = scanForSecrets(text);
    const o = matches.find((m) => m.pattern === "openai_key");
    expect(o).toBeDefined();
    expect(o!.preview).toBe("sk-AAA***");
  });

  it("detects an RSA private key header", () => {
    const matches = scanForSecrets("-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n");
    expect(matches.some((m) => m.pattern === "private_key_header")).toBe(true);
  });

  it("detects an OpenSSH private key header", () => {
    const matches = scanForSecrets("-----BEGIN OPENSSH PRIVATE KEY-----\nb3Bl...");
    expect(matches.some((m) => m.pattern === "private_key_header")).toBe(true);
  });

  it("detects a generic PRIVATE KEY header (no algorithm prefix)", () => {
    const matches = scanForSecrets("-----BEGIN PRIVATE KEY-----");
    expect(matches.some((m) => m.pattern === "private_key_header")).toBe(true);
  });

  it("detects a JWT", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkphbmUiLCJpYXQiOjE1MTYyMzkwMjJ9.abc-_DEF";
    const matches = scanForSecrets(`Authorization: Bearer ${jwt}`);
    const j = matches.find((m) => m.pattern === "jwt_token");
    expect(j).toBeDefined();
    expect(j!.preview).toBe("eyJhbG***");
  });
});

describe("scanForSecrets — negative cases (typical Q&A marketplace text)", () => {
  const benignQuestions = [
    "How do I authenticate with the AWS SDK?",
    "I'm getting a JWT error from my API",
    "What's the best way to handle Stripe keys safely?",
    "My SSH agent isn't loading my private key",
    "What does sk- mean in OpenAI keys?",
    "I see BEGIN sequence in my output",
    "AKIA something",                          // no following 16 alphanum
    "ghp_short",                                 // under 36 chars
    "sk_live_short",                             // under 24 char tail
    "sk-ant-tiny",                               // under 32 char tail
    "sk-tooShort",                               // under 48 char tail
    "Talk about OpenAI keys vs Anthropic keys",
    "",                                           // empty string
    "What is a JWT?",
    "eyJfoo.eyJbar",                              // missing third segment
  ];

  for (const q of benignQuestions) {
    it(`does not match: "${q.slice(0, 40)}${q.length > 40 ? "..." : ""}"`, () => {
      expect(scanForSecrets(q)).toEqual([]);
    });
  }
});

describe("scanForSecrets — boundary edges", () => {
  it("Anthropic key matches anthropic_key only, NOT openai_key", () => {
    const key = "sk-ant-TESTONLYNOTAREALKEY00000000000000";
    const matches = scanForSecrets(`USE ${key} HERE`);
    expect(matches.filter((m) => m.pattern === "anthropic_key")).toHaveLength(1);
    expect(matches.filter((m) => m.pattern === "openai_key")).toHaveLength(0);
  });

  it("47-char OpenAI tail does NOT match openai_key", () => {
    const tail = "A".repeat(47);
    expect(scanForSecrets(`sk-${tail}`)).toEqual([]);
  });

  it("49-char OpenAI tail does NOT match openai_key (trailing-char lookahead rejects)", () => {
    const tail = "A".repeat(49);
    expect(scanForSecrets(`sk-${tail}`).filter((m) => m.pattern === "openai_key")).toHaveLength(0);
  });

  it("two distinct secrets in one body return two matches", () => {
    const text = `Bearer ghp_TESTONLYNOTAREALTOKENXXXXXXXXXXXX0000 and AKIAIOSFODNN7EXAMPLE`;
    const matches = scanForSecrets(text);
    expect(matches.map((m) => m.pattern).sort()).toEqual(["aws_access_key", "github_pat"]);
  });

  it("null-ish text returns []", () => {
    // @ts-expect-error null input — runtime should not throw
    expect(scanForSecrets(null)).toEqual([]);
    // @ts-expect-error undefined input — runtime should not throw
    expect(scanForSecrets(undefined)).toEqual([]);
  });
});
