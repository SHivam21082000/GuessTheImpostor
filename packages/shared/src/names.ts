import type { Cricketer } from "./types";

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Name parts that are too common to count as "saying the name" on their own. */
const COMMON_PARTS = new Set(["singh", "khan", "sharma", "kumar", "yadav", "patel", "iyer", "de", "du", "al", "shah", "mohammed", "mohammad"]);

/**
 * Terms that would give the secret player away if typed in a clue:
 * full name, aliases, and distinctive surname / first-name tokens (4+ letters).
 */
export function forbiddenTerms(c: Cricketer): string[] {
  const terms = new Set<string>();
  terms.add(normalize(c.name));
  for (const a of c.aliases) {
    const n = normalize(a);
    if (n.length >= 2) terms.add(n);
  }
  for (const part of normalize(c.name).split(" ")) {
    if (part.length >= 4 && !COMMON_PARTS.has(part)) terms.add(part);
  }
  return [...terms];
}

/** true when the clue text contains the player's name, a distinctive name part or an alias. */
export function clueRevealsName(text: string, c: Cricketer): boolean {
  const padded = ` ${normalize(text)} `;
  const squashed = normalize(text).replace(/ /g, "");
  return forbiddenTerms(c).some((t) => padded.includes(` ${t} `) || (t.length >= 6 && squashed.includes(t.replace(/ /g, ""))));
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]!;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length]!;
}

/** Search the pool for autocomplete; matches name, aliases and typos. */
export function searchCricketers(pool: Cricketer[], query: string, limit = 8): Cricketer[] {
  const q = normalize(query);
  if (!q) return [];
  const scored = pool
    .map((c) => {
      const names = [c.name, ...c.aliases].map(normalize);
      let score = Infinity;
      for (const n of names) {
        if (n === q) score = Math.min(score, 0);
        else if (n.startsWith(q)) score = Math.min(score, 1);
        else if (n.split(" ").some((w) => w.startsWith(q))) score = Math.min(score, 2);
        else if (n.includes(q)) score = Math.min(score, 3);
        else if (q.length >= 4) {
          const d = levenshtein(q, n.slice(0, q.length + 1));
          if (d <= 2) score = Math.min(score, 4 + d);
        }
      }
      return { c, score };
    })
    .filter((x) => x.score < Infinity)
    .sort((a, b) => a.score - b.score || b.c.popularity - a.c.popularity);
  return scored.slice(0, limit).map((x) => x.c);
}
