/**
 * Export and Report Utilities (PDF / CSV / JSON)
 */

import { Interview, AssessmentReport, Question, Answer, Evaluation, VisualEngagementMetrics } from '../types/index.ts';
import { computeSpeechAnalytics } from './speechAnalytics.ts';

export function exportReportToCSV(data: {
  interview: Interview;
  report: AssessmentReport;
  questions: Question[];
  answers: Answer[];
  evaluations: Evaluation[];
  visualMetrics?: VisualEngagementMetrics;
}) {
  const { interview, report, questions, answers, evaluations, visualMetrics } = data;
  const speech = computeSpeechAnalytics(answers);

  const rows: string[][] = [
    ['INTERVAI - AI INTERVIEW ASSESSMENT REPORT'],
    ['Candidate Name', interview.candidateName],
    ['Target Job Role', interview.jobRole],
    ['Experience Level', interview.experienceLevel],
    ['Interview Type', interview.interviewType],
    ['Difficulty', interview.difficulty],
    ['Completed At', interview.completedAt || new Date().toISOString()],
    ['Overall Score', `${report.overallScore}/100`],
    ['Technical Accuracy', `${report.technicalScore}/100`],
    ['Communication', `${report.communicationScore}/100`],
    ['Reasoning & Problem Solving', `${report.reasoningScore}/100`],
    ['Relevance', `${report.relevanceScore}/100`],
    ['Completeness', `${report.completenessScore}/100`],
    ['Visual Engagement (Practice Signal)', `${report.visualEngagementScore}/100`],
    [],
    ['EXECUTIVE SUMMARY'],
    [`"${report.executiveSummary.replace(/"/g, '""')}"`],
    [],
    ['STRENGTHS'],
    ...report.strengths.map((s) => [s]),
    [],
    ['AREAS FOR IMPROVEMENT'],
    ...report.weaknesses.map((w) => [w]),
    [],
    ['RECOMMENDATIONS'],
    ...report.recommendations.map((r) => [r]),
    [],
    ['SPOKEN DELIVERY ANALYTICS (text-based, from transcripts)'],
    ['Filler Words', `${speech.fillerWordCount}`],
    ['Words Spoken', `${speech.totalWords}`],
    [
      'Speaking Pace (WPM)',
      speech.wordsPerMinute === null ? 'Unavailable (no recorded duration)' : `${speech.wordsPerMinute} wpm`,
    ],
    ['Filler Vocabulary', speech.fillerVocabulary.join(', ')],
    [],
    ['QUESTION-BY-QUESTION BREAKDOWN'],
    [
      'Order',
      'Category',
      'Difficulty',
      'Question Text',
      'Candidate Answer Transcript',
      'Score',
      'Technical Accuracy',
      'Communication',
      'Reasoning',
      'AI Feedback',
      'Model Answer',
    ],
  ];

  questions.forEach((q) => {
    const ans = answers.find((a) => a.questionId === q.id);
    const ev = evaluations.find((e) => e.questionId === q.id);
    rows.push([
      `Q${q.orderIndex}`,
      q.category,
      q.difficultyLevel,
      `"${q.questionText.replace(/"/g, '""')}"`,
      `"${(ans?.transcript || 'No answer').replace(/"/g, '""')}"`,
      `${ev?.overallScore || 0}/100`,
      `${ev?.technicalAccuracy || 0}`,
      `${ev?.communication || 0}`,
      `${ev?.reasoning || 0}`,
      `"${(ev?.feedback || '').replace(/"/g, '""')}"`,
      `"${(ev?.suggestedAnswer || '').replace(/"/g, '""')}"`,
    ]);
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `IntervAI_Report_${interview.jobRole.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printOrExportPDF() {
  window.print();
}
