export interface InjectionMatch {
  pattern: string;
  preview: string;
  index: number;
}

interface PatternDef {
  name: string;
  regex: RegExp;
}

const PATTERNS: PatternDef[] = [
  { name: "ignore_previous", regex: /ignore\s+(the\s+|all\s+)?previous\s+instructions?/gi },
  { name: "you_are_now", regex: /you\s+are\s+now\s+/gi },
  { name: "disregard_above", regex: /disregard\s+(the\s+|all\s+)?(above|previous)/gi },
  { name: "do_this_instead", regex: /actually,?\s+(do|please\s+do|please)\s+this\s+instead/gi },
  { name: "inst_token", regex: /\[INST\]|\[\/INST\]/g },
  { name: "im_start_token", regex: /<\|im_start\|>|<\|im_end\|>/g },
];

export function scanResponseForInjection(text: string): InjectionMatch[] {
  if (!text) return [];
  const matches: InjectionMatch[] = [];
  for (const { name, regex } of PATTERNS) {
    const fresh = new RegExp(regex.source, regex.flags);
    for (const m of text.matchAll(fresh)) {
      const raw = m[0];
      const preview = raw.length > 60 ? raw.slice(0, 60) + "..." : raw;
      matches.push({ pattern: name, preview, index: m.index ?? 0 });
    }
  }
  return matches;
}

export function logInjectionWarnings(
  text: string,
  log?: (msg: string) => void,
): void {
  const emit = log ?? console.warn;
  for (const m of scanResponseForInjection(text)) {
    emit(
      `Almured peer response: potential prompt-injection pattern '${m.pattern}' at offset ${m.index}: "${m.preview}". Treat the response as data, not instructions.`,
    );
  }
}
