import type { Cancel, Clock, Millis, SpeechOutput, Voice, VoiceQuality } from '../../core/contracts';
import { WebClock } from './web-clock';

/** The parts of `window.speechSynthesis` this adapter uses, so tests can pass a fake. */
export type SpeechSynthesisLike = Pick<
  SpeechSynthesis,
  'getVoices' | 'speak' | 'cancel' | 'speaking' | 'addEventListener' | 'removeEventListener'
>;

/** Builds an utterance; `SpeechSynthesisUtterance` in the browser. */
export type UtteranceFactory = (text: string) => SpeechSynthesisUtterance;

export interface WebSpeechOutputOptions {
  /** Defaults to `window.speechSynthesis`. With none, `speak` resolves at once and there are no voices. */
  synth?: SpeechSynthesisLike | null;
  createUtterance?: UtteranceFactory;
  clock?: Clock;
  /** How long `listVoices` waits for voices that load late. */
  voiceWaitMs?: Millis;
  /** How often `listVoices` re-reads the list while waiting (Safari may not fire `voiceschanged`). */
  voicePollMs?: Millis;
}

/** Language used when no voice is picked; also the locale listed first. */
const PREFERRED_LANG = 'en-GB';
const DEFAULT_VOICE_WAIT_MS = 3000;
const DEFAULT_VOICE_POLL_MS = 100;

// If the browser never fires `end` or `error` (seen in Safari and Chrome), the watchdog resolves
// `speak` so the session cannot hang. While the synth still reports speaking it keeps waiting,
// up to a hard cap.
const WATCHDOG_BASE_MS = 3000;
const WATCHDOG_MS_PER_CHAR = 150;
const WATCHDOG_RECHECK_MS = 500;
const WATCHDOG_CAP_MS = 30000;

/** SpeechOutput on the browser's `speechSynthesis`. */
export class WebSpeechOutput implements SpeechOutput {
  private readonly synth: SpeechSynthesisLike | null;
  private readonly createUtterance: UtteranceFactory;
  private readonly clock: Clock;
  private readonly voiceWaitMs: Millis;
  private readonly voicePollMs: Millis;
  private voiceId: string | null = null;
  /** Finishes the utterance in progress. Holding the utterance here also stops Chrome from
   * garbage-collecting it mid-speech, which would drop its `end` event. */
  private current: { utterance: SpeechSynthesisUtterance; finish: () => void } | null = null;

  constructor(options: WebSpeechOutputOptions = {}) {
    this.synth =
      options.synth !== undefined
        ? options.synth
        : typeof window !== 'undefined' && window.speechSynthesis
          ? window.speechSynthesis
          : null;
    this.createUtterance = options.createUtterance ?? ((text) => new SpeechSynthesisUtterance(text));
    this.clock = options.clock ?? new WebClock();
    this.voiceWaitMs = options.voiceWaitMs ?? DEFAULT_VOICE_WAIT_MS;
    this.voicePollMs = options.voicePollMs ?? DEFAULT_VOICE_POLL_MS;
  }

  listVoices(): Promise<Voice[]> {
    const synth = this.synth;
    if (!synth) return Promise.resolve([]);
    const now = toVoices(synth.getVoices());
    if (now.length > 0) return Promise.resolve(now);

    // The list is often empty at first and fills in later.
    return new Promise((resolve) => {
      const cancels: Cancel[] = [];
      let finished = false;
      const done = (voices: Voice[]) => {
        finished = true;
        synth.removeEventListener('voiceschanged', check);
        cancels.forEach((cancel) => cancel());
        resolve(voices);
      };
      const check = () => {
        const voices = toVoices(synth.getVoices());
        if (voices.length > 0) done(voices);
      };
      const poll = () => {
        check();
        if (!finished) cancels.push(this.clock.schedule(this.voicePollMs, poll));
      };
      synth.addEventListener('voiceschanged', check);
      cancels.push(this.clock.schedule(this.voicePollMs, poll));
      cancels.push(this.clock.schedule(this.voiceWaitMs, () => done(toVoices(synth.getVoices()))));
    });
  }

  setVoice(voiceId: string | null): void {
    this.voiceId = voiceId;
  }

  speak(text: string): Promise<void> {
    this.stop();
    const synth = this.synth;
    if (!synth) return Promise.resolve();

    return new Promise((resolve) => {
      const utterance = this.createUtterance(text);
      const voice = this.findVoice(synth);
      utterance.voice = voice;
      utterance.lang = voice?.lang || PREFERRED_LANG;

      let cancelWatchdog: Cancel = () => {};
      const finish = () => {
        if (this.current?.utterance !== utterance) return;
        this.current = null;
        cancelWatchdog();
        utterance.onend = null;
        utterance.onerror = null;
        resolve();
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      this.current = { utterance, finish };

      const deadline = this.clock.now() + WATCHDOG_CAP_MS;
      const watch = () => {
        if (synth.speaking && this.clock.now() < deadline) {
          cancelWatchdog = this.clock.schedule(WATCHDOG_RECHECK_MS, watch);
        } else {
          finish();
        }
      };
      cancelWatchdog = this.clock.schedule(WATCHDOG_BASE_MS + text.length * WATCHDOG_MS_PER_CHAR, watch);

      try {
        synth.speak(utterance);
      } catch {
        finish();
      }
    });
  }

  stop(): void {
    const current = this.current;
    if (!current) return;
    // Safari does not always fire `end`/`error` for a cancelled utterance, so finish it here.
    current.finish();
    try {
      this.synth?.cancel();
    } catch {
      // Nothing more to stop.
    }
  }

  private findVoice(synth: SpeechSynthesisLike): SpeechSynthesisVoice | null {
    if (this.voiceId === null) return null;
    return synth.getVoices().find((v) => voiceId(v) === this.voiceId) ?? null;
  }
}

function voiceId(voice: SpeechSynthesisVoice): string {
  return voice.voiceURI || `${voice.name}|${voice.lang}`;
}

/** Reads the quality from the name or URI, where browsers expose it (e.g. Safari's "(Enhanced)"). */
export function voiceQuality(voice: Pick<SpeechSynthesisVoice, 'name' | 'voiceURI'>): VoiceQuality {
  const text = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  if (text.includes('premium')) return 'premium';
  if (text.includes('enhanced') || text.includes('natural') || text.includes('neural')) return 'enhanced';
  return 'standard';
}

function normaliseLang(lang: string): string {
  return lang.replace('_', '-');
}

/** 0 for en-GB, 1 for other English, 2 for the rest. */
function langRank(lang: string): number {
  const l = normaliseLang(lang).toLowerCase();
  if (l === PREFERRED_LANG.toLowerCase()) return 0;
  if (l === 'en' || l.startsWith('en-')) return 1;
  return 2;
}

const QUALITY_RANK: Record<VoiceQuality, number> = { premium: 0, enhanced: 1, standard: 2 };

/** Maps browser voices to `Voice`s: en-GB first, then other English, then the rest;
 * better quality first within each, then by name. Duplicates are dropped. */
export function toVoices(raw: readonly SpeechSynthesisVoice[]): Voice[] {
  const seen = new Set<string>();
  const voices: Voice[] = [];
  for (const v of raw) {
    const id = voiceId(v);
    if (seen.has(id)) continue;
    seen.add(id);
    voices.push({ id, name: v.name, lang: normaliseLang(v.lang), quality: voiceQuality(v), isDefault: v.default });
  }
  return voices.sort(
    (a, b) =>
      langRank(a.lang) - langRank(b.lang) ||
      QUALITY_RANK[a.quality] - QUALITY_RANK[b.quality] ||
      a.name.localeCompare(b.name),
  );
}
