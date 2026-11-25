export type VoiceQuality = 'standard' | 'enhanced' | 'premium';

export interface Voice {
  /** Stable id for remembering the choice on this device (e.g. the browser's voiceURI). */
  id: string;
  name: string;
  /** BCP 47 tag, e.g. 'en-GB'. */
  lang: string;
  /** 'standard' when the platform does not say. */
  quality: VoiceQuality;
  /** The platform's default voice. */
  isDefault: boolean;
}

/** The app's voice. Implemented by speechSynthesis on web, expo-speech on iOS. */
export interface SpeechOutput {
  /**
   * Voices on this device, en-GB first. Waits for voices that load late, so it may take
   * a moment the first time. Resolves to an empty list if none ever arrive.
   */
  listVoices(): Promise<Voice[]>;
  /** Picks the voice for later `speak` calls. `null` uses the platform default. */
  setVoice(voiceId: string | null): void;
  /**
   * Speaks `text` and resolves only when speech has finished, because the controller turns
   * the mic on straight after. Also resolves (never rejects) if stopped or if speech fails,
   * so the session cannot hang.
   */
  speak(text: string): Promise<void>;
  /** Stops speaking now. Any pending `speak` resolves. */
  stop(): void;
}
