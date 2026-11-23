/** Short non-speech sounds. Only one in M1. */
export type Chime = 'correct';

/** Implemented by Web Audio on web, expo-audio on iOS. */
export interface AudioCues {
  /**
   * Prepares audio output. Must be called from a user gesture (the Start tap) on web,
   * where browsers keep audio locked until then. A no-op where not needed.
   */
  unlock(): Promise<void>;
  /** Plays the chime and resolves when it has finished. Never rejects. */
  play(chime: Chime): Promise<void>;
}
