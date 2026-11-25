import type {
  Cancel,
  Clock,
  Millis,
  SpeechInput,
  SpeechInputErrorCode,
  SpeechInputEvent,
  SpeechInputListener,
} from '../contracts';

/** What the "user" does in one listening turn. */
export type ScriptedTurn =
  /**
   * Says `transcript`. speech-start fires `afterMs` after `start` (default 1000), an interim halfway
   * through speaking, and the final `durationMs` after speech-start (default 1000).
   */
  | { say: string; afterMs?: Millis; durationMs?: Millis }
  /** Says nothing: no events, so the controller's silence timers run. */
  | { silence: true }
  /** The recogniser reports an error `afterMs` after `start` (default 0). Fatal errors end the turn. */
  | { error: SpeechInputErrorCode; fatal?: boolean; afterMs?: Millis };

/**
 * A SpeechInput that plays back a script, one turn per `start`, timed on the given clock.
 * When the script runs out, turns are silent. Tests can also push events by hand with `emit`.
 */
export class ScriptedSpeechInput implements SpeechInput {
  /** Every `start` and `stop` call, in order, for asserting the mic was off while speaking. */
  readonly calls: ('start' | 'stop')[] = [];
  private listener: SpeechInputListener | null = null;
  private pending: Cancel[] = [];
  private readonly script: ScriptedTurn[];

  constructor(
    private readonly clock: Clock,
    script: readonly ScriptedTurn[] = [],
  ) {
    this.script = [...script];
  }

  get isListening(): boolean {
    return this.listener !== null;
  }

  /** Turns not yet played. */
  get remainingTurns(): number {
    return this.script.length;
  }

  /** Adds turns to the end of the script. */
  queue(...turns: ScriptedTurn[]): void {
    this.script.push(...turns);
  }

  start(listener: SpeechInputListener): void {
    this.calls.push('start');
    this.cancelPending();
    this.listener = listener;
    const turn = this.script.shift() ?? { silence: true };
    if ('say' in turn) {
      const startAt = turn.afterMs ?? 1000;
      const duration = turn.durationMs ?? 1000;
      this.at(startAt, () => this.emit({ type: 'speech-start', at: this.clock.now() }));
      this.at(startAt + duration / 2, () =>
        this.emit({ type: 'interim', at: this.clock.now(), transcript: turn.say }),
      );
      this.at(startAt + duration, () => this.emit({ type: 'final', at: this.clock.now(), transcript: turn.say }));
    } else if ('error' in turn) {
      const fatal = turn.fatal ?? false;
      this.at(turn.afterMs ?? 0, () => this.emit({ type: 'error', at: this.clock.now(), code: turn.error, fatal }));
    }
  }

  stop(): void {
    this.calls.push('stop');
    this.cancelPending();
    this.listener = null;
  }

  /** Delivers an event to the current listener, ending the turn on a final transcript or fatal error. Ignored when not listening. */
  emit(event: SpeechInputEvent): void {
    const listener = this.listener;
    if (!listener) return;
    if (event.type === 'final' || (event.type === 'error' && event.fatal)) {
      this.cancelPending();
      this.listener = null;
    }
    listener(event);
  }

  private at(delayMs: Millis, fn: () => void): void {
    this.pending.push(this.clock.schedule(delayMs, fn));
  }

  private cancelPending(): void {
    for (const cancel of this.pending) cancel();
    this.pending = [];
  }
}
