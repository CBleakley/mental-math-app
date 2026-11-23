import type { Cancel, Clock, Millis, SpeechOutput, Voice } from '../contracts';

export interface SilentSpeechOutputOptions {
  voices?: Voice[];
  /** With a clock, each `speak` takes `msPerUtterance` of fake time. Without one, it resolves at once. */
  clock?: Clock;
  msPerUtterance?: Millis;
}

/** A SpeechOutput that records what would be said instead of saying it. */
export class SilentSpeechOutput implements SpeechOutput {
  /** Every text passed to `speak`, in order. */
  readonly spoken: string[] = [];
  voiceId: string | null = null;
  private finishCurrent: (() => void) | null = null;
  private cancelTimer: Cancel | null = null;

  constructor(private readonly options: SilentSpeechOutputOptions = {}) {}

  get isSpeaking(): boolean {
    return this.finishCurrent !== null;
  }

  async listVoices(): Promise<Voice[]> {
    return [...(this.options.voices ?? [])];
  }

  setVoice(voiceId: string | null): void {
    this.voiceId = voiceId;
  }

  speak(text: string): Promise<void> {
    this.stop();
    this.spoken.push(text);
    const { clock, msPerUtterance = 0 } = this.options;
    if (!clock || msPerUtterance <= 0) return Promise.resolve();
    return new Promise((resolve) => {
      this.finishCurrent = () => {
        this.finishCurrent = null;
        this.cancelTimer?.();
        this.cancelTimer = null;
        resolve();
      };
      this.cancelTimer = clock.schedule(msPerUtterance, this.finishCurrent);
    });
  }

  stop(): void {
    this.finishCurrent?.();
  }
}
