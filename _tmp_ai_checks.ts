import { evaluateCandidateAnswer } from './server/ai.ts';

const question: any = {
  id: 'q1',
  interviewId: 'i1',
  orderIndex: 1,
  questionText: 'How do you design a resilient distributed caching layer and mitigate cache avalanche and stampede?',
  category: 'Distributed Systems & Caching',
  difficultyLevel: 'hard',
  expectedPoints: ['Cache-aside pattern', 'Jitter in TTLs', 'Distributed locking', 'Cache invalidation'],
};

const cases: [string, string][] = [
  ['empty', ''],
  ['single-word', 'abcd'],
  ['gibberish', 'asdf asdf asdf qwer'],
  ['off-topic', 'I really enjoy playing football on weekends with my friends because it is fun and relaxing.'],
  ['on-topic', 'I would use a cache-aside pattern with Redis and add jitter to TTLs to avoid cache avalanche. I would also use distributed locking or a mutex to prevent a cache stampede, and discuss trade-offs for production.'],
];

async function main() {
  delete process.env.GEMINI_API_KEY;
  delete process.env.AI_API_KEY;

  const results: Record<string, { overall: number; strengths: number }> = {};
  for (const [label, text] of cases) {
    const ev = await evaluateCandidateAnswer({
      interview: { jobRole: 'Backend Developer', experienceLevel: 'senior', interviewType: 'technical' } as any,
      question,
      answerTranscript: text,
    });
    results[label] = { overall: ev.overallScore, strengths: ev.strengths.length };
    console.log(label, '=> overall', ev.overallScore, '| strengths', ev.strengths.length, '|', ev.feedback.slice(0, 60));
  }

  let pass = true;
  if (!(results['single-word'].overall <= 15)) { console.log('FAIL single-word too high'); pass = false; }
  if (!(results['gibberish'].overall <= 15)) { console.log('FAIL gibberish too high'); pass = false; }
  if (!(results['empty'].overall <= 15)) { console.log('FAIL empty too high'); pass = false; }
  if (results['single-word'].strengths !== 0) { console.log('FAIL single-word has praise'); pass = false; }
  if (!(results['on-topic'].overall >= 40)) { console.log('FAIL on-topic too low'); pass = false; }
  if (!(results['on-topic'].overall > results['gibberish'].overall + 20)) { console.log('FAIL on-topic not clearly better'); pass = false; }

  console.log(pass ? 'AI FALLBACK CHECKS: PASS' : 'AI FALLBACK CHECKS: FAIL');
  process.exit(pass ? 0 : 1);
}

main();
