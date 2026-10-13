/**
 * Candidate personalization helpers (resume / job-description).
 * Pure, dependency-free utilities shared by UI prefill and (optionally) server code.
 * NOTE: text passed here is UNTRUSTED user input - this module only measures and
 * keyword-matches it; it never executes, evaluates, or interprets it as instructions.
 */

export const MAX_RESUME_CHARS = 20000;
export const MAX_JD_CHARS = 20000;

/** Normalize line endings, trim, and hard-cap length. Never throws on odd input. */
export function truncate(input: string | undefined | null, max: number): string {
  if (input === undefined || input === null) return '';
  const normalized = String(input).replace(/\r\n/g, '\n').trim();
  return normalized.length > max ? normalized.slice(0, max) : normalized;
}

/**
 * Case-insensitive keyword match of known skill terms against free text.
 * Uses a non-alphanumeric boundary so "React" does not match "Reactive".
 * Returns a de-duplicated list preserving the vocabulary's canonical casing.
 */
export function extractSkillsFromText(
  text: string | undefined | null,
  vocabulary: string[]
): string[] {
  const haystack = (text || '').toLowerCase();
  if (!haystack.trim()) return [];

  const found: string[] = [];
  for (const term of vocabulary) {
    const label = term.trim();
    if (!label) continue;
    const needle = label.toLowerCase();
    if (found.some((f) => f.toLowerCase() === needle)) continue;

    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
    if (pattern.test(haystack)) {
      found.push(label);
    }
  }
  return found;
}
