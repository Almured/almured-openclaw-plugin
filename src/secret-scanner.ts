export interface SecretMatch {
  pattern: string;
  preview: string;
  index: number;
}

export type SecretScanMode = "block" | "warn" | "off";

interface PatternDef {
  name: string;
  regex: RegExp;
}

const PATTERNS: PatternDef[] = [
  { name: "aws_access_key", regex: /AKIA[0-9A-Z]{16}/g },
  { name: "github_pat", regex: /ghp_[A-Za-z0-9]{36}/g },
  { name: "github_oauth", regex: /gho_[A-Za-z0-9]{36}/g },
  { name: "stripe_key", regex: /sk_(live|test)_[A-Za-z0-9]{24,}/g },
  { name: "anthropic_key", regex: /sk-ant-[A-Za-z0-9_-]{32,}/g },
  // openai_key: exactly 48 alphanumeric chars after `sk-`, not starting with `ant-`.
  // The negative lookahead `(?!ant-)` keeps Anthropic keys from double-matching here;
  // the trailing `(?![A-Za-z0-9])` rejects 49+ char tails.
  { name: "openai_key", regex: /sk-(?!ant-)[A-Za-z0-9]{48}(?![A-Za-z0-9])/g },
  {
    name: "private_key_header",
    regex: /-----BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/g,
  },
  {
    name: "jwt_token",
    regex: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  },
];

export function scanForSecrets(text: string): SecretMatch[] {
  if (!text) return [];
  const matches: SecretMatch[] = [];
  for (const { name, regex } of PATTERNS) {
    // Fresh regex per call so the stateful `g` lastIndex doesn't leak across invocations.
    const fresh = new RegExp(regex.source, regex.flags);
    for (const m of text.matchAll(fresh)) {
      const raw = m[0];
      matches.push({
        pattern: name,
        preview: raw.slice(0, 6) + "***",
        index: m.index ?? 0,
      });
    }
  }
  return matches;
}
