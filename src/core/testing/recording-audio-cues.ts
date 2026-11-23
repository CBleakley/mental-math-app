import type { AudioCues, Chime } from '../contracts';

/** An AudioCues that records what would be played. */
export class RecordingAudioCues implements AudioCues {
  readonly played: Chime[] = [];
  unlocked = false;

  async unlock(): Promise<void> {
    this.unlocked = true;
  }

  async play(chime: Chime): Promise<void> {
    this.played.push(chime);
  }
}
