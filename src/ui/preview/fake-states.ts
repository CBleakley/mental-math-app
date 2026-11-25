// Fake SessionStates for building and testing the screens without a real controller.
import type { SessionState, Voice } from '../../core/contracts';

const FIVE_MINUTES = 5 * 60_000;

const base: SessionState = {
  phase: 'idle',
  durationMs: FIVE_MINUTES,
  timeLeftMs: FIVE_MINUTES,
  score: { correct: 0, attempted: 0 },
  question: null,
  feedback: null,
  summary: null,
  error: null,
};

export function fakeState(overrides: Partial<SessionState> = {}): SessionState {
  return { ...base, ...overrides };
}

/** One state per screen state in the designs, plus the edge cases. */
export const fakeStates = {
  idle: fakeState(),
  idleWithError: fakeState({ error: 'Microphone access was refused. Allow it in Settings, then tap Start.' }),
  speaking: fakeState({
    phase: 'speaking',
    timeLeftMs: 184_000,
    score: { correct: 9, attempted: 11 },
    question: '47 plus 38',
  }),
  listening: fakeState({
    phase: 'listening',
    timeLeftMs: 192_000,
    score: { correct: 9, attempted: 11 },
    question: '47 plus 38',
  }),
  correct: fakeState({
    phase: 'feedback',
    timeLeftMs: 188_000,
    score: { correct: 10, attempted: 12 },
    question: '47 plus 38',
    feedback: { outcome: 'correct' },
  }),
  wrong: fakeState({
    phase: 'feedback',
    timeLeftMs: 186_000,
    score: { correct: 9, attempted: 12 },
    question: '47 plus 38',
    feedback: { outcome: 'wrong', question: '47 plus 38', correctAnswer: 85 },
  }),
  missed: fakeState({
    phase: 'feedback',
    timeLeftMs: 150_000,
    score: { correct: 9, attempted: 13 },
    question: '56 plus 29',
    feedback: { outcome: 'missed', question: '56 plus 29', correctAnswer: 85 },
  }),
  lastProblem: fakeState({
    phase: 'listening',
    timeLeftMs: 0,
    score: { correct: 17, attempted: 21 },
    question: '68 plus 24',
  }),
  micError: fakeState({
    phase: 'listening',
    timeLeftMs: 240_000,
    question: '47 plus 38',
    error: 'The microphone stopped working.',
  }),
  summary: fakeState({
    phase: 'summary',
    timeLeftMs: 0,
    score: { correct: 18, attempted: 22 },
    summary: {
      correct: 18,
      attempted: 22,
      accuracy: 18 / 22,
      averageResponseMs: 3_100,
      endedBy: 'time-up',
      sentence: '18 out of 22, averaging 3.1 seconds.',
    },
  }),
  summaryNothingAnswered: fakeState({
    phase: 'summary',
    timeLeftMs: 270_000,
    summary: {
      correct: 0,
      attempted: 0,
      accuracy: 0,
      averageResponseMs: null,
      endedBy: 'user',
      sentence: 'Session ended.',
    },
  }),
} satisfies Record<string, SessionState>;

export type FakeStateName = keyof typeof fakeStates;

export const fakeVoices: readonly Voice[] = [
  { id: 'serena', name: 'Serena', lang: 'en-GB', quality: 'premium', isDefault: false },
  { id: 'daniel', name: 'Daniel', lang: 'en-GB', quality: 'enhanced', isDefault: true },
  { id: 'kate', name: 'Kate', lang: 'en-GB', quality: 'standard', isDefault: false },
];
