import type { Cancel, Clock, Millis } from '../../core/contracts';

/**
 * Clock on `performance.now()`, the same time base as browser event timestamps
 * (e.g. a SpeechRecognition event's `timeStamp`), so they can be compared directly.
 */
export class WebClock implements Clock {
  now(): Millis {
    return performance.now();
  }

  schedule(delayMs: Millis, callback: () => void): Cancel {
    const id = setTimeout(callback, delayMs);
    return () => clearTimeout(id);
  }
}
