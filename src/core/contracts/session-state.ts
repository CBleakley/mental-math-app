import type { Millis } from './clock';

export type SessionPhase =
  /** Before Start. */
  | 'idle'
  /** The app is speaking a question, a repeat or "sorry, again?". Mic off. */
  | 'speaking'
  /** Mic on, waiting for an answer. */
  | 'listening'
  /** Reacting to the last answer: chime, or saying the correct answer. Mic off. */
  | 'feedback'
  /** Session over; `summary` is set. */
  | 'summary';

/** How a problem ended. */
export type ProblemOutcome = 'correct' | 'wrong' | 'missed';

export type Feedback =
  | { outcome: 'correct' }
  /** Wrong or missed: the screen shows the question and its correct answer. */
  | { outcome: 'wrong' | 'missed'; question: string; correctAnswer: number };

export interface Score {
  correct: number;
  /** Problems finished, including wrong and missed ones. */
  attempted: number;
}

export interface SessionSummary extends Score {
  /** correct / attempted, 0 to 1. 0 when nothing was attempted. */
  accuracy: number;
  /** Mean over answered problems (correct or wrong); null if none were answered. */
  averageResponseMs: Millis | null;
  /** 'mic-error': a fatal mic error (e.g. permission refused) stopped the session; `SessionState.error` says why. */
  endedBy: 'time-up' | 'user' | 'mic-error';
  /** The sentence spoken at the end, e.g. "18 out of 22, averaging 3.1 seconds". */
  sentence: string;
}

/**
 * The view model the screens render. Screens read only this; they never reach into the controller.
 * The score is here for the controller's use, but the session screen must not show it (only the summary does).
 */
export interface SessionState {
  phase: SessionPhase;
  durationMs: Millis;
  /** Counts down to 0; stays at 0 while the last problem finishes. */
  timeLeftMs: Millis;
  score: Score;
  /** The question being asked or answered, e.g. "47 plus 38"; null when there is none. */
  question: string | null;
  /** Feedback on the last finished problem, while phase is 'feedback'; otherwise null. */
  feedback: Feedback | null;
  /** Set when phase is 'summary'. */
  summary: SessionSummary | null;
  /** A fatal mic error to show, e.g. permission refused. */
  error: string | null;
}
