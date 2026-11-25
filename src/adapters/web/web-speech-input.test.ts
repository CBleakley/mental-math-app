import type { SpeechInputEvent } from '../../core/contracts';
import { FakeClock } from '../../core/testing';
import {
  type RecognitionErrorEventLike,
  type RecognitionEventLike,
  type RecognitionLike,
  type RecognitionResultEventLike,
  WebSpeechInput,
} from './web-speech-input';

class FakeRecognition implements RecognitionLike {
  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 0;
  onaudiostart: ((event: RecognitionEventLike) => void) | null = null;
  onsoundstart: ((event: RecognitionEventLike) => void) | null = null;
  onspeechstart: ((event: RecognitionEventLike) => void) | null = null;
  onresult: ((event: RecognitionResultEventLike) => void) | null = null;
  onerror: ((event: RecognitionErrorEventLike) => void) | null = null;
  onend: ((event: RecognitionEventLike) => void) | null = null;
  started = false;
  aborted = false;

  start(): void {
    this.started = true;
  }

  abort(): void {
    this.aborted = true;
  }

  speechStart(timeStamp?: number): void {
    this.onspeechstart?.({ timeStamp });
  }

  /** Sends the given result segments (the browser always sends the full list). */
  result(...segments: string[]): void {
    this.onresult?.({ results: segments.map((transcript) => Object.assign([{ transcript }], { isFinal: false })) });
  }

  error(error: string): void {
    this.onerror?.({ error });
  }

  end(): void {
    this.onend?.({});
  }
}

function setup(options: { supported?: boolean } = {}) {
  const clock = new FakeClock(1000);
  const recs: FakeRecognition[] = [];
  const input = new WebSpeechInput({
    clock,
    createRecognition:
      options.supported === false
        ? null
        : () => {
            const rec = new FakeRecognition();
            recs.push(rec);
            return rec;
          },
  });
  const events: SpeechInputEvent[] = [];
  const listener = (event: SpeechInputEvent) => events.push(event);
  const last = () => recs[recs.length - 1];
  return { clock, recs, input, events, listener, last };
}

describe('WebSpeechInput', () => {
  it('configures an en-GB continuous recogniser with interim results', () => {
    const { input, listener, last } = setup();
    input.start(listener);
    expect(last()).toMatchObject({ lang: 'en-GB', continuous: true, interimResults: true, started: true });
  });

  it('emits speech-start, interims, then the final transcript after 1 s of silence', () => {
    const { clock, input, events, listener, last } = setup();
    input.start(listener);
    clock.advance(2000);
    last().speechStart(clock.now() - 50);
    clock.advance(300);
    last().result('forty');
    clock.advance(400);
    last().result('85');
    clock.advance(999);
    expect(events.map((e) => e.type)).toEqual(['speech-start', 'interim', 'interim']);
    clock.advance(1);
    expect(events).toEqual([
      { type: 'speech-start', at: 2950 },
      { type: 'interim', at: 3300, transcript: 'forty' },
      { type: 'interim', at: 3700, transcript: '85' },
      { type: 'final', at: 4700, transcript: '85' },
    ]);
    expect(last().aborted).toBe(true);
  });

  it('joins result segments and skips unchanged interims', () => {
    const { clock, input, events, listener, last } = setup();
    input.start(listener);
    last().result('85');
    last().result('85');
    last().result('85', 'no 86');
    clock.advance(1000);
    expect(events.filter((e) => e.type === 'interim')).toHaveLength(2);
    expect(events[events.length - 1]).toMatchObject({ type: 'final', transcript: '85 no 86' });
  });

  it('uses the first result as speech-start when speechstart never fires', () => {
    const { clock, input, events, listener, last } = setup();
    input.start(listener);
    clock.advance(1500);
    last().result('85');
    expect(events[0]).toEqual({ type: 'speech-start', at: 2500 });
  });

  it('ignores an implausible event timestamp', () => {
    const { clock, input, events, listener, last } = setup();
    input.start(listener);
    clock.advance(500);
    last().speechStart(Date.now() + 1e9);
    expect(events[0]).toEqual({ type: 'speech-start', at: 1500 });
  });

  it('finishes straight away when the recogniser ends with words heard', () => {
    const { input, events, listener, last } = setup();
    input.start(listener);
    last().result('12');
    last().end();
    expect(events[events.length - 1]).toMatchObject({ type: 'final', transcript: '12' });
  });

  it('restarts quietly when the recogniser ends with nothing heard, and speech-start can fire again', () => {
    const { clock, recs, input, events, listener, last } = setup();
    input.start(listener);
    clock.advance(5000);
    recs[0].speechStart(); // a cough
    recs[0].error('no-speech');
    recs[0].end();
    clock.advance(0);
    expect(recs).toHaveLength(2);
    expect(recs[1].started).toBe(true);
    clock.advance(1000);
    last().speechStart();
    last().result('63');
    clock.advance(1000);
    expect(events.map((e) => e.type)).toEqual(['speech-start', 'error', 'speech-start', 'interim', 'final']);
    expect(events[1]).toMatchObject({ code: 'no-speech', fatal: false });
  });

  it('backs off on quick ends and gives up after five in a row', () => {
    const { clock, recs, input, events, listener } = setup();
    input.start(listener);
    const startTimes: number[] = [];
    for (let i = 0; i < 4; i++) {
      recs[recs.length - 1].end();
      const before = recs.length;
      while (recs.length === before) clock.advance(10);
      startTimes.push(clock.now());
    }
    expect(recs).toHaveLength(5);
    // Back-off doubles: 200, 400, 800, 1600 ms.
    expect(startTimes.map((t, i) => t - (i === 0 ? 1000 : startTimes[i - 1]))).toEqual([200, 400, 800, 1600]);
    expect(events).toEqual([]);
    recs[4].end();
    expect(events).toEqual([expect.objectContaining({ type: 'error', code: 'unavailable', fatal: true })]);
    clock.advance(10000);
    expect(recs).toHaveLength(5);
  });

  it('treats a start that throws as an ended recogniser and retries', () => {
    const { clock, recs, input, listener } = setup();
    let first = true;
    const original = FakeRecognition.prototype.start;
    jest.spyOn(FakeRecognition.prototype, 'start').mockImplementation(function (this: FakeRecognition) {
      if (first) {
        first = false;
        throw { name: 'InvalidStateError' };
      }
      original.call(this);
    });
    input.start(listener);
    clock.advance(500);
    expect(recs).toHaveLength(2);
    expect(recs[1].started).toBe(true);
    jest.restoreAllMocks();
  });

  it.each([
    ['not-allowed', 'not-allowed'],
    ['service-not-allowed', 'unavailable'],
    ['audio-capture', 'audio-capture'],
    ['language-not-supported', 'unavailable'],
  ])('surfaces %s as a fatal %s error and ends the turn', (browserError, code) => {
    const { clock, recs, input, events, listener, last } = setup();
    input.start(listener);
    last().error(browserError);
    last().end();
    clock.advance(10000);
    expect(events).toEqual([expect.objectContaining({ type: 'error', code, fatal: true })]);
    expect(recs).toHaveLength(1);
    expect(recs[0].aborted).toBe(true);
  });

  it('reports other errors as non-fatal and keeps listening', () => {
    const { clock, input, recs, events, listener } = setup();
    input.start(listener);
    recs[0].error('network');
    recs[0].end();
    clock.advance(200);
    expect(events).toEqual([expect.objectContaining({ type: 'error', code: 'other', fatal: false, message: 'network' })]);
    expect(recs).toHaveLength(2);
  });

  it('ignores aborted errors', () => {
    const { input, events, listener, last } = setup();
    input.start(listener);
    last().error('aborted');
    expect(events).toEqual([]);
  });

  it('reports unsupported browsers as a fatal error, asynchronously', () => {
    const { clock, input, events, listener } = setup({ supported: false });
    expect(input.isSupported).toBe(false);
    input.start(listener);
    expect(events).toEqual([]);
    clock.advance(0);
    expect(events).toEqual([expect.objectContaining({ type: 'error', code: 'unavailable', fatal: true })]);
  });

  it('stop ends the turn: recogniser aborted, no more events', () => {
    const { clock, input, events, listener, last } = setup();
    input.start(listener);
    const rec = last();
    rec.result('40');
    input.stop();
    expect(rec.aborted).toBe(true);
    rec.result('47');
    rec.end();
    clock.advance(5000);
    expect(events.map((e) => e.type)).toEqual(['speech-start', 'interim']);
    expect(() => input.stop()).not.toThrow();
  });

  it('lets the listener start the next turn from the final event, with a fresh recogniser', () => {
    const { clock, recs, input, listener } = setup();
    const finals: string[] = [];
    let turns = 0;
    const loop = (event: SpeechInputEvent) => {
      listener(event);
      if (event.type === 'final') {
        finals.push(event.transcript);
        if (++turns < 20) input.start(loop);
      }
    };
    input.start(loop);
    for (let i = 0; i < 20; i++) {
      recs[recs.length - 1].result(String(i));
      clock.advance(1000);
    }
    expect(finals).toEqual(Array.from({ length: 20 }, (_, i) => String(i)));
    expect(recs).toHaveLength(20);
    expect(recs.every((r) => r.aborted)).toBe(true);
  });

  it('starting again mid-turn drops the old recogniser', () => {
    const { clock, recs, input, events, listener } = setup();
    input.start(listener);
    recs[0].result('1');
    input.start(listener);
    recs[0].result('2');
    recs[0].end();
    clock.advance(2000);
    expect(recs[0].aborted).toBe(true);
    expect(events.map((e) => e.type)).toEqual(['speech-start', 'interim']);
  });
});
