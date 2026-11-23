import type { Millis } from './clock';
import type { SpeechInputErrorCode } from './speech-input';
import type { Command, ParseResult } from './utterance-parser';
import type { ProblemOutcome, SessionSummary } from './session-state';

/** Why the app is (re)asking a question. */
export type AskReason = 'new' | 'repeat-command' | 'silence' | 'sorry-again';

/**
 * One entry in the session event log. Every answer, command and timing is logged so M1-12
 * can measure mishears and speech-start timing on the iPhone. All `at` values are Clock.now().
 */
export type SessionEvent =
  | { type: 'session-start'; at: Millis; durationMs: Millis }
  | { type: 'ask'; at: Millis; problemId: string; text: string; reason: AskReason }
  /** The app finished speaking the question: the start of the response-time window. */
  | { type: 'question-spoken'; at: Millis; problemId: string }
  | { type: 'listening-start'; at: Millis; problemId: string }
  | { type: 'speech-start'; at: Millis; problemId: string }
  | { type: 'interim'; at: Millis; problemId: string; transcript: string }
  /** Every final transcript, with what the parser made of it. */
  | { type: 'transcript'; at: Millis; problemId: string; transcript: string; parsed: ParseResult }
  /** A command is not an attempt; its speech-start is not an answer time. */
  | { type: 'command'; at: Millis; problemId: string; command: Command }
  /** `attempt` 2 counts as wrong. */
  | { type: 'unrecognised'; at: Millis; problemId: string; transcript: string; attempt: 1 | 2 }
  /** 'repeat' after the first 10 s of silence, 'skip' after the second. */
  | { type: 'silence-timeout'; at: Millis; problemId: string; action: 'repeat' | 'skip' }
  | { type: 'input-error'; at: Millis; problemId: string | null; code: SpeechInputErrorCode; fatal: boolean; message?: string }
  | {
      type: 'problem-end';
      at: Millis;
      problemId: string;
      outcome: ProblemOutcome;
      expected: number;
      /** The number heard; null when missed or unrecognised twice. */
      given: number | null;
      /** question-spoken → speech-start of the answer; null when there was no answer. */
      responseMs: Millis | null;
    }
  | { type: 'session-end'; at: Millis; summary: SessionSummary };

export type SessionEventType = SessionEvent['type'];
