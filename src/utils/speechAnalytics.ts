/**
 * Speech Delivery Analytics
 *
 * Text-based delivery metrics computed ONLY from real data we already store:
 *   - Filler-word frequency, derived from the stored spoken transcript text.
 *   - Speaking pace (words per minute), derived from transcript word count and
 *     the recorded answer audio duration.
 *
 * These are transparent delivery heuristics, not judgements about a candidate's
 * emotion, confidence, personality, or psychological state. When the required
 * data is missing (empty transcript, no/zero recorded duration) the metric is
 * reported as unavailable rather than guessed, and a genuine zero is never
 * confused with "no data".
 */

import { Answer } from '../types/index.ts';

/**
 * Documented filler-word / filler-phrase vocabulary. Matching is whole-word and
 * case-insensitive; multi-word phrases are matched as a whitespace-separated
 * sequence. This list is intentionally fixed so results are reproducible.
 */
export const FILLER_VOCABULARY: readonly string[] = [
  'um',
  'uh',
  'uhm',
  'erm',
  'er',
  'hmm',
  'mm',
  'like',
  'you know',
  'i mean',
  'sort of',
  'kind of',
  'basically',
  'actually',
  'literally',
  'you see',
  'right',
  'okay',
  'so',
  'well',
  'yeah',
];

export interface PerAnswerSpeechMetric {
  questionId: string;
  words: number;
  fillerCount: number;
  durationSeconds: number;
  wordsPerMinute: number | null;
}

export interface SpeechAnalytics {
  /** True when at least one non-empty transcript exists. */
  hasTranscripts: boolean;
  /** True when at least one answer has a positive recorded audio duration. */
  hasDuration: boolean;
  totalWords: number;
  /** True even when there are zero filler words, as long as words exist. */
  fillerWordCount: number;
  fillerWords: { word: string; count: number }[];
  totalDurationSeconds: number;
  /** null when duration data is unavailable; never a fabricated number. */
  wordsPerMinute: number | null;
  perAnswer: {
    questionId: string;
    words: number;
    fillerCount: number;
    durationSeconds: number;
    wpm: number | null;
  }[];
  fillerVocabulary: readonly string[];
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u02bc']/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(normalized: string): string[] {
  if (!normalized) return [];
  return normalized.split(' ').filter((t) => /[a-z0-9]/.test(t));
}

function countPhrase(normalized: string, phrase: string): number {
  if (!normalized) return 0;
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const re = new RegExp(`\\b${escaped}\\b`, 'g');
  const matches = normalized.match(re);
  return matches ? matches.length : 0;
}

function safeDuration(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function pace(words: number, durationSeconds: number): number | null {
  // Unavailable when there is no spoken content or no valid duration - never 0
  // by division, and never a fabricated number.
  if (durationSeconds <= 0 || words <= 0) return null;
  return Math.round(words / (durationSeconds / 60));
}

export function computeSpeechAnalytics(answers: Answer[]): SpeechAnalytics {
  const fillerTotals: Record<string, number> = {};
  for (const phrase of FILLER_VOCABULARY) fillerTotals[phrase] = 0;

  let totalWords = 0;
  let totalDurationSeconds = 0;
  let hasTranscripts = false;

  const perAnswer = (answers || []).map((a) => {
    const normalized = normalize(a?.transcript || '');
    const tokens = tokenize(normalized);
    const words = tokens.length;
    if (words > 0) hasTranscripts = true;

    let fillerCount = 0;
    for (const phrase of FILLER_VOCABULARY) {
      const c = countPhrase(normalized, phrase);
      if (c > 0) {
        fillerTotals[phrase] += c;
        fillerCount += c;
      }
    }

    const durationSeconds = safeDuration(a?.audioDurationSeconds);
    totalWords += words;
    totalDurationSeconds += durationSeconds;

    return {
      questionId: a?.questionId,
      words,
      fillerCount,
      durationSeconds,
      wpm: pace(words, durationSeconds),
    };
  });

  const fillerWordCount = Object.values(fillerTotals).reduce((sum, c) => sum + c, 0);
  const fillerWords = Object.entries(fillerTotals)
    .filter(([, count]) => count > 0)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));

  return {
    hasTranscripts,
    hasDuration: totalDurationSeconds > 0,
    totalWords,
    fillerWordCount,
    fillerWords,
    totalDurationSeconds,
    wordsPerMinute: pace(totalWords, totalDurationSeconds),
    perAnswer,
    fillerVocabulary: FILLER_VOCABULARY,
  };
}
