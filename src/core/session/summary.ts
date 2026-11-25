import type { Millis, ProblemOutcome, SessionSummary } from '../contracts';

export interface FinishedProblem {
  outcome: ProblemOutcome;
  /** null when there was no answer (missed, or unrecognised twice). */
  responseMs: Millis | null;
}

/** Plain seconds for speech: 3100 → "3.1", 2000 → "2". */
function seconds(ms: Millis): string {
  return (Math.round(ms / 100) / 10).toString();
}

/** The one sentence spoken at the end, e.g. "18 out of 22, averaging 3.1 seconds". */
export function summarySentence(correct: number, attempted: number, averageResponseMs: Millis | null): string {
  const score = `${correct} out of ${attempted}`;
  if (averageResponseMs === null) return `${score}.`;
  const s = seconds(averageResponseMs);
  return `${score}, averaging ${s} ${s === '1' ? 'second' : 'seconds'}.`;
}

export function buildSummary(problems: readonly FinishedProblem[], endedBy: SessionSummary['endedBy']): SessionSummary {
  const attempted = problems.length;
  const correct = problems.filter((p) => p.outcome === 'correct').length;
  const times = problems.map((p) => p.responseMs).filter((ms): ms is Millis => ms !== null);
  const averageResponseMs = times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;
  return {
    correct,
    attempted,
    accuracy: attempted ? correct / attempted : 0,
    averageResponseMs,
    endedBy,
    sentence: summarySentence(correct, attempted, averageResponseMs),
  };
}
