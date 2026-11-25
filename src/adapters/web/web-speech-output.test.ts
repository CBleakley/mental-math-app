import { FakeClock, flushMicrotasks } from '../../core/testing/fake-clock';
import { toVoices, voiceQuality, WebSpeechOutput } from './web-speech-output';

function voice(name: string, lang: string, extra: Partial<SpeechSynthesisVoice> = {}): SpeechSynthesisVoice {
  return { name, lang, voiceURI: `uri:${name}`, default: false, localService: true, ...extra };
}

class FakeUtterance {
  voice: SpeechSynthesisVoice | null = null;
  lang = '';
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(readonly text: string) {}
}

/** A fake `speechSynthesis`: tests end utterances by hand. */
class FakeSynth {
  voices: SpeechSynthesisVoice[] = [];
  queue: FakeUtterance[] = [];
  cancelCount = 0;
  /** Whether `cancel` fires `error` on the cancelled utterance (Chrome does; Safari may not). */
  cancelFiresError = true;
  private listeners = new Set<() => void>();

  get speaking(): boolean {
    return this.queue.length > 0;
  }
  getVoices = () => this.voices;
  speak = (u: FakeUtterance) => {
    this.queue.push(u);
  };
  cancel = () => {
    this.cancelCount++;
    const cancelled = this.queue;
    this.queue = [];
    if (this.cancelFiresError) cancelled.forEach((u) => u.onerror?.());
  };
  addEventListener = (_type: string, fn: () => void) => this.listeners.add(fn);
  removeEventListener = (_type: string, fn: () => void) => this.listeners.delete(fn);
  get listenerCount() {
    return this.listeners.size;
  }
  loadVoices(voices: SpeechSynthesisVoice[], fireEvent = true) {
    this.voices = voices;
    if (fireEvent) this.listeners.forEach((fn) => fn());
  }
  finishCurrent() {
    const u = this.queue.shift();
    u?.onend?.();
  }
}

function setup() {
  const synth = new FakeSynth();
  const clock = new FakeClock();
  const output = new WebSpeechOutput({
    synth: synth as unknown as SpeechSynthesis,
    createUtterance: (text) => new FakeUtterance(text) as unknown as SpeechSynthesisUtterance,
    clock,
  });
  return { synth, clock, output };
}

/** Tracks whether a promise has settled. */
function track(p: Promise<void>) {
  const state = { done: false };
  p.then(() => (state.done = true));
  return state;
}

describe('voice list', () => {
  it('puts en-GB first, then other English, then the rest, better quality first', () => {
    const ids = toVoices([
      voice('Amélie', 'fr-FR'),
      voice('Samantha', 'en-US'),
      voice('Daniel', 'en-GB'),
      voice('Serena (Premium)', 'en-GB'),
      voice('Arthur (Enhanced)', 'en_GB'),
    ]).map((v) => v.name);
    expect(ids).toEqual(['Serena (Premium)', 'Arthur (Enhanced)', 'Daniel', 'Samantha', 'Amélie']);
  });

  it('maps fields, normalises en_GB and drops duplicates', () => {
    const voices = toVoices([
      voice('Daniel', 'en_GB', { default: true }),
      voice('Daniel', 'en_GB', { default: true }),
      voice('No URI', 'en-GB', { voiceURI: '' }),
    ]);
    expect(voices).toEqual([
      { id: 'uri:Daniel', name: 'Daniel', lang: 'en-GB', quality: 'standard', isDefault: true },
      { id: 'No URI|en-GB', name: 'No URI', lang: 'en-GB', quality: 'standard', isDefault: false },
    ]);
  });

  it.each([
    ['Serena (Premium)', 'x', 'premium'],
    ['Serena', 'com.apple.voice.premium.en-GB.Serena', 'premium'],
    ['Arthur (Enhanced)', 'x', 'enhanced'],
    ['Microsoft Sonia Online (Natural) - English (United Kingdom)', 'x', 'enhanced'],
    ['Google UK English Female', 'Google UK English Female', 'standard'],
  ] as const)('reads quality of %s / %s as %s', (name, voiceURI, quality) => {
    expect(voiceQuality({ name, voiceURI })).toBe(quality);
  });

  it('returns voices at once when already loaded', async () => {
    const { synth, output } = setup();
    synth.voices = [voice('Daniel', 'en-GB')];
    expect((await output.listVoices()).map((v) => v.name)).toEqual(['Daniel']);
  });

  it('waits for voices that arrive with voiceschanged', async () => {
    const { synth, clock, output } = setup();
    const result = output.listVoices();
    clock.advance(500);
    synth.loadVoices([voice('Daniel', 'en-GB')]);
    expect((await result).map((v) => v.name)).toEqual(['Daniel']);
    expect(synth.listenerCount).toBe(0);
    expect(clock.pendingCount).toBe(0);
  });

  it('finds late voices by polling when no event fires (Safari)', async () => {
    const { synth, clock, output } = setup();
    const result = output.listVoices();
    synth.loadVoices([voice('Daniel', 'en-GB')], false);
    clock.advance(100);
    expect((await result).map((v) => v.name)).toEqual(['Daniel']);
    expect(clock.pendingCount).toBe(0);
  });

  it('gives up with an empty list if voices never arrive', async () => {
    const { synth, clock, output } = setup();
    const result = output.listVoices();
    clock.advance(3000);
    expect(await result).toEqual([]);
    expect(synth.listenerCount).toBe(0);
    expect(clock.pendingCount).toBe(0);
  });

  it('is empty without speechSynthesis', async () => {
    expect(await new WebSpeechOutput({ synth: null }).listVoices()).toEqual([]);
  });
});

describe('speak', () => {
  it('resolves only when speech has finished', async () => {
    const { synth, output } = setup();
    const state = track(output.speak('47 plus 38'));
    await flushMicrotasks();
    expect(synth.queue[0].text).toBe('47 plus 38');
    expect(state.done).toBe(false);
    synth.finishCurrent();
    await flushMicrotasks();
    expect(state.done).toBe(true);
  });

  it('uses the picked voice, or en-GB with the default voice', async () => {
    const { synth, output } = setup();
    synth.voices = [voice('Daniel', 'en-GB'), voice('Samantha', 'en-US')];

    void output.speak('one');
    expect(synth.queue[0].voice).toBeNull();
    expect(synth.queue[0].lang).toBe('en-GB');

    output.setVoice('uri:Samantha');
    void output.speak('two');
    expect(synth.queue[0].voice?.name).toBe('Samantha');
    expect(synth.queue[0].lang).toBe('en-US');

    output.setVoice('uri:gone');
    void output.speak('three');
    expect(synth.queue[0].voice).toBeNull();
  });

  it('resolves when speech fails', async () => {
    const { synth, output } = setup();
    const state = track(output.speak('47 plus 38'));
    synth.queue[0].onerror?.();
    await flushMicrotasks();
    expect(state.done).toBe(true);
  });

  it('stop resolves the pending speak even if cancel fires no event (Safari)', async () => {
    const { synth, output } = setup();
    synth.cancelFiresError = false;
    const state = track(output.speak('47 plus 38'));
    output.stop();
    await flushMicrotasks();
    expect(state.done).toBe(true);
    expect(synth.cancelCount).toBe(1);
    expect(synth.speaking).toBe(false);
  });

  it('a new speak stops the previous one, and late events from it are ignored', async () => {
    const { synth, output } = setup();
    const first = track(output.speak('first'));
    const firstUtterance = synth.queue[0];
    const second = track(output.speak('second'));
    await flushMicrotasks();
    expect(first.done).toBe(true);
    firstUtterance.onend?.();
    await flushMicrotasks();
    expect(second.done).toBe(false);
    expect(synth.queue.map((u) => u.text)).toEqual(['second']);
  });

  it('the watchdog resolves if no end event ever comes, waiting while still speaking', async () => {
    const { synth, clock, output } = setup();
    const state = track(output.speak('0123456789')); // first check at 3000 + 10 * 150 = 4500 ms
    clock.advance(4500);
    await flushMicrotasks();
    expect(state.done).toBe(false); // still speaking, so it rechecks
    synth.queue = []; // speech stopped without an event
    clock.advance(500);
    await flushMicrotasks();
    expect(state.done).toBe(true);
    expect(clock.pendingCount).toBe(0);
  });

  it('the watchdog gives up after 30 s even if the synth says it is still speaking', async () => {
    const { clock, output } = setup();
    const state = track(output.speak('stuck'));
    clock.advance(29999);
    await flushMicrotasks();
    expect(state.done).toBe(false);
    clock.advance(1000);
    await flushMicrotasks();
    expect(state.done).toBe(true);
  });

  it('resolves if speak throws, and at once without speechSynthesis', async () => {
    const { synth, output } = setup();
    synth.speak = () => {
      throw new Error('blocked');
    };
    await expect(output.speak('x')).resolves.toBeUndefined();
    await expect(new WebSpeechOutput({ synth: null }).speak('x')).resolves.toBeUndefined();
  });

  it('stop with nothing speaking does nothing', () => {
    const { synth, output } = setup();
    output.stop();
    expect(synth.cancelCount).toBe(0);
  });
});
