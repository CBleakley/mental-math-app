import type { Millis } from './clock';

export type SpeechInputErrorCode =
  /** Mic permission refused. Fatal: listening cannot continue. */
  | 'not-allowed'
  /** The recogniser heard nothing. Not fatal; the controller's own silence timers decide what happens. */
  | 'no-speech'
  /** Audio capture failed (no mic, mic taken). Fatal. */
  | 'audio-capture'
  /** Recogniser service unavailable. Fatal. */
  | 'unavailable'
  | 'other';

/** Everything the mic reports during one listening turn. `at` is on the same time base as Clock.now(). */
export type SpeechInputEvent =
  /** The user started speaking. Used for the answer time. */
  | { type: 'speech-start'; at: Millis }
  /** Partial transcript. Logged only, so M1-12 can compare it with speech-start for timing. */
  | { type: 'interim'; at: Millis; transcript: string }
  /** Final transcript, after about 1 s of silence. Ends the turn: no more events until `start` is called again. */
  | { type: 'final'; at: Millis; transcript: string }
  | { type: 'error'; at: Millis; code: SpeechInputErrorCode; fatal: boolean; message?: string };

export type SpeechInputListener = (event: SpeechInputEvent) => void;

/**
 * The mic. Implemented by SpeechRecognition (en-GB) on web, expo-speech-recognition on iOS.
 *
 * One `start` is one turn: it listens until a final transcript, a fatal error, or `stop`.
 * The adapter hides recogniser restarts within a turn (e.g. Safari timing out on silence),
 * so a quiet user simply produces no events and the controller's timers handle it.
 */
export interface SpeechInput {
  /** Starts a turn. Events go to `listener` until the turn ends. Calling while listening restarts the turn. */
  start(listener: SpeechInputListener): void;
  /** Ends the turn without a final transcript. No more events are delivered. Safe to call when not listening. */
  stop(): void;
}
