import type { SpeechInputEvent } from '../contracts';
import { FakeClock, RecordingAudioCues, ScriptedSpeechInput, SilentSpeechOutput, type ScriptedTurn } from './index';

describe('FakeClock', () => {
  it('starts at the given time and only moves when advanced', () => {
    const clock = new FakeClock(500);
    expect(clock.now()).toBe(500);
    clock.advance(250);
    expect(clock.now()).toBe(750);
  });

  it('fires callbacks in time order, ties in scheduling order, at their own time', () => {
    const clock = new FakeClock();
    const fired: string[] = [];
    clock.schedule(200, () => fired.push(`b@${clock.now()}`));
    clock.schedule(100, () => fired.push(`a@${clock.now()}`));
    clock.schedule(200, () => fired.push(`c@${clock.now()}`));
    clock.advance(150);
    expect(fired).toEqual(['a@100']);
    clock.advance(50);
    expect(fired).toEqual(['a@100', 'b@200', 'c@200']);
    expect(clock.pendingCount).toBe(0);
  });

  it('fires callbacks scheduled while advancing if they fall in the window', () => {
    const clock = new FakeClock();
    const fired: number[] = [];
    clock.schedule(100, () => clock.schedule(100, () => fired.push(clock.now())));
    clock.advance(150);
    expect(fired).toEqual([]);
    clock.advance(50);
    expect(fired).toEqual([200]);
  });

  it('does not fire cancelled callbacks', () => {
    const clock = new FakeClock();
    const fn = jest.fn();
    const cancel = clock.schedule(100, fn);
    cancel();
    cancel();
    clock.advance(1000);
    expect(fn).not.toHaveBeenCalled();
  });

  it('advanceAsync lets awaiting code run between timers', async () => {
    const clock = new FakeClock();
    const log: number[] = [];
    const wait = (ms: number) => new Promise<void>((resolve) => clock.schedule(ms, resolve));
    void (async () => {
      await wait(100);
      log.push(clock.now());
      await wait(100);
      log.push(clock.now());
    })();
    await clock.advanceAsync(250);
    expect(log).toEqual([100, 200]);
    expect(clock.now()).toBe(250);
  });
});

describe('ScriptedSpeechInput', () => {
  function setup(script: ScriptedTurn[] = []) {
    const clock = new FakeClock();
    const input = new ScriptedSpeechInput(clock, script);
    const events: SpeechInputEvent[] = [];
    return { clock, input, events, listen: () => input.start((e) => events.push(e)) };
  }

  it('plays a spoken turn as speech-start, interim and final at the scripted times', () => {
    const { clock, input, events, listen } = setup([{ say: '85', afterMs: 2000, durationMs: 800 }]);
    listen();
    expect(input.isListening).toBe(true);
    clock.advance(5000);
    expect(events).toEqual([
      { type: 'speech-start', at: 2000 },
      { type: 'interim', at: 2400, transcript: '85' },
      { type: 'final', at: 2800, transcript: '85' },
    ]);
    expect(input.isListening).toBe(false);
  });

  it('uses 1 s defaults and plays one turn per start', () => {
    const { clock, events, listen } = setup([{ say: 'repeat' }, { say: '85' }]);
    listen();
    clock.advance(3000);
    listen();
    clock.advance(3000);
    expect(events.filter((e) => e.type === 'final')).toEqual([
      { type: 'final', at: 2000, transcript: 'repeat' },
      { type: 'final', at: 5000, transcript: '85' },
    ]);
  });

  it('is silent for a silence turn and once the script runs out', () => {
    const { clock, input, events, listen } = setup([{ silence: true }]);
    listen();
    clock.advance(30_000);
    input.stop();
    listen();
    clock.advance(30_000);
    expect(events).toEqual([]);
    expect(input.remainingTurns).toBe(0);
  });

  it('delivers nothing after stop', () => {
    const { clock, input, events, listen } = setup([{ say: '85' }]);
    listen();
    clock.advance(1200);
    input.stop();
    clock.advance(5000);
    expect(events.map((e) => e.type)).toEqual(['speech-start']);
    expect(input.calls).toEqual(['start', 'stop']);
  });

  it('reports errors, ending the turn only when fatal', () => {
    const { clock, input, events, listen } = setup([
      { error: 'no-speech', afterMs: 100 },
      { error: 'not-allowed', fatal: true },
    ]);
    listen();
    clock.advance(200);
    expect(input.isListening).toBe(true);
    listen();
    clock.advance(0);
    expect(input.isListening).toBe(false);
    expect(events).toEqual([
      { type: 'error', at: 100, code: 'no-speech', fatal: false },
      { type: 'error', at: 200, code: 'not-allowed', fatal: true },
    ]);
  });

  it('lets tests emit events by hand and queue more turns', () => {
    const { clock, input, events, listen } = setup();
    input.emit({ type: 'final', at: 0, transcript: 'ignored' });
    listen();
    input.emit({ type: 'final', at: 0, transcript: 'skip' });
    input.queue({ say: '12' });
    listen();
    clock.advance(2000);
    expect(events.map((e) => e.type === 'final' && e.transcript)).toEqual(['skip', false, false, '12']);
  });
});

describe('SilentSpeechOutput', () => {
  it('records what is spoken and resolves at once by default', async () => {
    const speech = new SilentSpeechOutput();
    await speech.speak('47 plus 38');
    await speech.speak('85');
    expect(speech.spoken).toEqual(['47 plus 38', '85']);
    expect(speech.isSpeaking).toBe(false);
  });

  it('takes fake time per utterance when given a clock', async () => {
    const clock = new FakeClock();
    const speech = new SilentSpeechOutput({ clock, msPerUtterance: 1500 });
    let done = false;
    void speech.speak('47 plus 38').then(() => (done = true));
    await clock.advanceAsync(1499);
    expect(done).toBe(false);
    expect(speech.isSpeaking).toBe(true);
    await clock.advanceAsync(1);
    expect(done).toBe(true);
  });

  it('resolves a pending speak on stop', async () => {
    const clock = new FakeClock();
    const speech = new SilentSpeechOutput({ clock, msPerUtterance: 1500 });
    const spoken = speech.speak('47 plus 38');
    speech.stop();
    await expect(spoken).resolves.toBeUndefined();
    expect(clock.pendingCount).toBe(0);
  });

  it('lists the given voices and remembers the chosen one', async () => {
    const voice = { id: 'v1', name: 'Daniel', lang: 'en-GB', quality: 'enhanced' as const, isDefault: false };
    const speech = new SilentSpeechOutput({ voices: [voice] });
    expect(await speech.listVoices()).toEqual([voice]);
    speech.setVoice('v1');
    expect(speech.voiceId).toBe('v1');
  });
});

describe('RecordingAudioCues', () => {
  it('records unlock and chimes', async () => {
    const cues = new RecordingAudioCues();
    await cues.unlock();
    await cues.play('correct');
    expect(cues.unlocked).toBe(true);
    expect(cues.played).toEqual(['correct']);
  });
});
