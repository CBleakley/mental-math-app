import type { Cancel, Clock, Millis } from '../contracts';

interface Timer {
  at: Millis;
  seq: number;
  callback: () => void;
}

/** Lets pending promise callbacks run, so async code awaiting fakes can catch up. */
export async function flushMicrotasks(rounds = 20): Promise<void> {
  for (let i = 0; i < rounds; i++) await Promise.resolve();
}

/**
 * A clock tests move by hand. Time only passes in `advance` / `advanceAsync`; scheduled
 * callbacks fire in time order (ties in the order scheduled), including ones scheduled while advancing.
 */
export class FakeClock implements Clock {
  private time: Millis;
  private timers: Timer[] = [];
  private seq = 0;

  constructor(startAt: Millis = 0) {
    this.time = startAt;
  }

  now(): Millis {
    return this.time;
  }

  schedule(delayMs: Millis, callback: () => void): Cancel {
    const timer: Timer = { at: this.time + Math.max(0, delayMs), seq: this.seq++, callback };
    this.timers.push(timer);
    return () => {
      this.timers = this.timers.filter((t) => t !== timer);
    };
  }

  /** Number of callbacks waiting to fire. */
  get pendingCount(): number {
    return this.timers.length;
  }

  /** Moves time forward `ms`, firing due callbacks synchronously. */
  advance(ms: Millis): void {
    const end = this.time + ms;
    for (let timer = this.takeDue(end); timer; timer = this.takeDue(end)) {
      this.time = timer.at;
      timer.callback();
    }
    this.time = end;
  }

  /**
   * Like `advance`, but lets promises settle before and after each callback. Use this when
   * the code under test awaits fakes (e.g. `await speech.speak(...)`) between timers.
   */
  async advanceAsync(ms: Millis): Promise<void> {
    const end = this.time + ms;
    await flushMicrotasks();
    for (let timer = this.takeDue(end); timer; timer = this.takeDue(end)) {
      this.time = timer.at;
      timer.callback();
      await flushMicrotasks();
    }
    this.time = end;
  }

  private takeDue(end: Millis): Timer | undefined {
    let next: Timer | undefined;
    for (const t of this.timers) {
      if (t.at <= end && (!next || t.at < next.at || (t.at === next.at && t.seq < next.seq))) next = t;
    }
    if (next) this.timers = this.timers.filter((t) => t !== next);
    return next;
  }
}
