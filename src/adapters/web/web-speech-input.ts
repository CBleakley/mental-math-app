import type {
  Cancel,
  Clock,
  Millis,
  SpeechInput,
  SpeechInputErrorCode,
  SpeechInputEvent,
  SpeechInputListener,
} from '../../core/contracts';

/**
 * The parts of the browser's SpeechRecognition this adapter uses. Declared here because
 * TypeScript's DOM lib does not ship SpeechRecognition types, and so tests can supply a fake.
 */
export interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onaudiostart: ((event: RecognitionEventLike) => void) | null;
  onsoundstart: ((event: RecognitionEventLike) => void) | null;
  onspeechstart: ((event: RecognitionEventLike) => void) | null;
  onresult: ((event: RecognitionResultEventLike) => void) | null;
  onerror: ((event: RecognitionErrorEventLike) => void) | null;
  onend: ((event: RecognitionEventLike) => void) | null;
  start(): void;
  abort(): void;
}

export interface RecognitionEventLike {
  /** Same time base as performance.now() in current browsers. */
  timeStamp?: number;
}

export interface RecognitionResultEventLike extends RecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;
}

export interface RecognitionErrorEventLike extends RecognitionEventLike {
  error: string;
  message?: string;
}

export type RecognitionFactory = () => RecognitionLike;

/** Raw recogniser activity, for the dev page and for measuring timings on the iPhone. */
export interface RecognitionDebugEntry {
  at: Millis;
  kind: 'recognition-start' | 'audiostart' | 'soundstart' | 'speechstart' | 'result' | 'error' | 'end' | 'restart';
  detail?: string;
}

export interface WebSpeechInputOptions {
  clock: Clock;
  /**
   * Makes a recogniser. Defaults to the browser's SpeechRecognition (or webkitSpeechRecognition).
   * When none is available, every turn ends with a fatal 'unavailable' error.
   */
  createRecognition?: RecognitionFactory | null;
  /** Recognition locale. Default 'en-GB', so "nought point five" is understood. */
  lang?: string;
  /** Silence after the last words that ends an answer. Default 1000 ms. */
  silenceMs?: Millis;
  /** Receives raw recogniser activity. */
  onDebug?: (entry: RecognitionDebugEntry) => void;
}

/** A recogniser that ends this soon after starting, having heard nothing, counts as a quick end. */
const QUICK_END_MS = 300;
/** This many quick ends in a row means the recogniser is not working: the turn fails. */
const MAX_QUICK_ENDS = 5;

interface Turn {
  listener: SpeechInputListener;
  startedAt: Millis;
  rec: RecognitionLike | null;
  recStartedAt: Millis;
  /** speech-start has been emitted for the current recogniser. */
  speechStarted: boolean;
  /** Latest transcript from the current recogniser. */
  transcript: string;
  quickEnds: number;
  silenceTimer: Cancel | null;
  restartTimer: Cancel | null;
}

/** Finds the browser's SpeechRecognition constructor, if there is one. */
export function browserRecognitionFactory(): RecognitionFactory | null {
  const g = globalThis as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  const Ctor = g.SpeechRecognition ?? g.webkitSpeechRecognition;
  return Ctor ? () => new Ctor() : null;
}

/**
 * SpeechInput on the browser's SpeechRecognition.
 *
 * - Each turn uses a fresh recogniser, so a turn never inherits a half-stopped one (Safari
 *   throws if `start` is called before the previous session has fully ended).
 * - Recognition runs in continuous mode with interim results; the answer ends after
 *   `silenceMs` without new words, rather than waiting for the browser's own end-pointing.
 * - speech-start uses the `speechstart` event's timestamp; if results arrive first, it uses
 *   the first result. If a recogniser ends having heard no words (a cough, background noise),
 *   it is restarted and speech-start can fire again: the last one before `final` is the answer's.
 * - Recognisers that end on their own with nothing heard (Safari and Chrome both time out)
 *   are restarted quietly, with a back-off if they keep ending immediately.
 */
export class WebSpeechInput implements SpeechInput {
  private readonly clock: Clock;
  private readonly createRecognition: RecognitionFactory | null;
  private readonly lang: string;
  private readonly silenceMs: Millis;
  private readonly onDebug?: (entry: RecognitionDebugEntry) => void;
  private turn: Turn | null = null;

  constructor(options: WebSpeechInputOptions) {
    this.clock = options.clock;
    this.createRecognition =
      options.createRecognition === undefined ? browserRecognitionFactory() : options.createRecognition;
    this.lang = options.lang ?? 'en-GB';
    this.silenceMs = options.silenceMs ?? 1000;
    this.onDebug = options.onDebug;
  }

  /** Whether this browser has speech recognition at all. */
  get isSupported(): boolean {
    return this.createRecognition !== null;
  }

  start(listener: SpeechInputListener): void {
    this.stop();
    const turn: Turn = {
      listener,
      startedAt: this.clock.now(),
      rec: null,
      recStartedAt: 0,
      speechStarted: false,
      transcript: '',
      quickEnds: 0,
      silenceTimer: null,
      restartTimer: null,
    };
    this.turn = turn;
    if (!this.createRecognition) {
      // Report asynchronously, like a real recogniser error, so `start` never calls back re-entrantly.
      turn.restartTimer = this.clock.schedule(0, () =>
        this.fail(turn, 'unavailable', 'Speech recognition is not supported in this browser.'),
      );
      return;
    }
    this.startRecognition(turn);
  }

  stop(): void {
    const turn = this.turn;
    if (!turn) return;
    this.turn = null;
    this.teardown(turn);
  }

  private startRecognition(turn: Turn): void {
    if (this.turn !== turn || !this.createRecognition) return;
    turn.restartTimer = null;
    turn.speechStarted = false;
    turn.transcript = '';

    const rec = this.createRecognition();
    rec.lang = this.lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    const isCurrent = () => this.turn === turn && turn.rec === rec;

    rec.onaudiostart = () => isCurrent() && this.debug('audiostart');
    rec.onsoundstart = () => isCurrent() && this.debug('soundstart');
    rec.onspeechstart = (event) => {
      if (!isCurrent()) return;
      this.debug('speechstart');
      if (!turn.speechStarted) this.speechStart(turn, this.eventTime(turn, event));
    };
    rec.onresult = (event) => {
      if (!isCurrent()) return;
      const transcript = joinResults(event.results);
      this.debug('result', transcript);
      if (!transcript) return;
      if (!turn.speechStarted) this.speechStart(turn, this.eventTime(turn, event));
      if (transcript !== turn.transcript) {
        turn.transcript = transcript;
        this.emit(turn, { type: 'interim', at: this.clock.now(), transcript });
      }
      if (this.turn !== turn) return;
      turn.silenceTimer?.();
      turn.silenceTimer = this.clock.schedule(this.silenceMs, () => this.finish(turn));
    };
    rec.onerror = (event) => {
      if (!isCurrent()) return;
      this.debug('error', event.error + (event.message ? `: ${event.message}` : ''));
      this.handleError(turn, event);
    };
    rec.onend = () => {
      if (!isCurrent()) return;
      this.debug('end');
      this.handleEnd(turn);
    };

    turn.rec = rec;
    turn.recStartedAt = this.clock.now();
    this.debug('recognition-start');
    try {
      rec.start();
    } catch (error) {
      // Safari throws InvalidStateError if the audio session is still busy; NotAllowedError without permission.
      const name = (error as { name?: string } | null)?.name;
      this.debug('error', `start threw ${name ?? String(error)}`);
      if (name === 'NotAllowedError') {
        this.fail(turn, 'not-allowed', 'Microphone permission was refused.');
      } else {
        this.handleEnd(turn);
      }
    }
  }

  private handleError(turn: Turn, event: RecognitionErrorEventLike): void {
    const message = event.message || undefined;
    switch (event.error) {
      case 'aborted':
        // We abort recognisers ourselves; otherwise `end` follows and restarts.
        return;
      case 'no-speech':
        this.emit(turn, { type: 'error', at: this.clock.now(), code: 'no-speech', fatal: false, message });
        return;
      case 'not-allowed':
        this.fail(turn, 'not-allowed', message ?? 'Microphone permission was refused.');
        return;
      case 'service-not-allowed':
        this.fail(turn, 'unavailable', message ?? 'Speech recognition is not allowed. Check that Dictation is on.');
        return;
      case 'audio-capture':
        this.fail(turn, 'audio-capture', message ?? 'The microphone could not be used.');
        return;
      case 'language-not-supported':
        this.fail(turn, 'unavailable', message ?? `Speech recognition does not support ${this.lang}.`);
        return;
      default:
        // e.g. 'network': transient; `end` follows and the recogniser restarts.
        this.emit(turn, {
          type: 'error',
          at: this.clock.now(),
          code: 'other',
          fatal: false,
          message: message ?? event.error,
        });
    }
  }

  private handleEnd(turn: Turn): void {
    if (this.turn !== turn) return;
    const rec = turn.rec;
    if (rec) detach(rec);
    turn.rec = null;

    if (turn.transcript) {
      // The recogniser decided the answer was over before our silence timer did.
      this.finish(turn);
      return;
    }

    turn.quickEnds = this.clock.now() - turn.recStartedAt < QUICK_END_MS ? turn.quickEnds + 1 : 0;
    if (turn.quickEnds >= MAX_QUICK_ENDS) {
      this.fail(turn, 'unavailable', 'Speech recognition keeps stopping straight away.');
      return;
    }
    const delay = turn.quickEnds === 0 ? 0 : Math.min(100 * 2 ** turn.quickEnds, 2000);
    this.debug('restart', `after ${delay} ms`);
    turn.restartTimer = this.clock.schedule(delay, () => this.startRecognition(turn));
  }

  private speechStart(turn: Turn, at: Millis): void {
    turn.speechStarted = true;
    this.emit(turn, { type: 'speech-start', at });
  }

  private finish(turn: Turn): void {
    this.emit(turn, { type: 'final', at: this.clock.now(), transcript: turn.transcript });
  }

  private fail(turn: Turn, code: SpeechInputErrorCode, message: string): void {
    this.emit(turn, { type: 'error', at: this.clock.now(), code, fatal: true, message });
  }

  /** Delivers an event. A final transcript or fatal error ends the turn first, so the listener may start the next. */
  private emit(turn: Turn, event: SpeechInputEvent): void {
    if (this.turn !== turn) return;
    if (event.type === 'final' || (event.type === 'error' && event.fatal)) {
      this.turn = null;
      this.teardown(turn);
    }
    turn.listener(event);
  }

  private teardown(turn: Turn): void {
    turn.silenceTimer?.();
    turn.restartTimer?.();
    turn.silenceTimer = null;
    turn.restartTimer = null;
    const rec = turn.rec;
    turn.rec = null;
    if (rec) {
      detach(rec);
      try {
        rec.abort();
      } catch {
        // Already stopped.
      }
    }
  }

  /** The event's own timestamp when it is plausible, which is earlier than now if delivery lagged. */
  private eventTime(turn: Turn, event: RecognitionEventLike): Millis {
    const now = this.clock.now();
    const stamp = event.timeStamp;
    if (typeof stamp === 'number' && stamp >= turn.recStartedAt && stamp <= now) return stamp;
    return now;
  }

  private debug(kind: RecognitionDebugEntry['kind'], detail?: string): void {
    this.onDebug?.({ at: this.clock.now(), kind, detail });
  }
}

function joinResults(results: RecognitionResultEventLike['results']): string {
  const parts: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const text = results[i]?.[0]?.transcript;
    if (text) parts.push(text.trim());
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function detach(rec: RecognitionLike): void {
  rec.onaudiostart = null;
  rec.onsoundstart = null;
  rec.onspeechstart = null;
  rec.onresult = null;
  rec.onerror = null;
  rec.onend = null;
}
