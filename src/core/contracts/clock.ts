/** Milliseconds on a monotonic clock. Only differences are meaningful. */
export type Millis = number;

/** Cancels a scheduled callback. Safe to call more than once, or after it has fired. */
export type Cancel = () => void;

/**
 * Time source for the core. All timestamps in the core (event log, speech-start,
 * response times) come from the same clock so they can be compared.
 *
 * The web adapter uses `performance.now()`, which is also the time base of browser
 * event timestamps. Tests use FakeClock and move time by hand.
 */
export interface Clock {
  now(): Millis;
  /** Runs `callback` once, `delayMs` from now. Used for the silence timers and session length. */
  schedule(delayMs: Millis, callback: () => void): Cancel;
}
