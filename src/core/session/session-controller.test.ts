import type { SessionEvent, SessionPhase, SessionSummary } from '../contracts';
import {
  FakeClock,
  RecordingAudioCues,
  ScriptedSpeechInput,
  SilentSpeechOutput,
  StubAdditionGenerator,
  StubPhraseBuilder,
  StubUtteranceParser,
  type ScriptedTurn,
} from '../testing';
import { SORRY_AGAIN, SessionController, type SessionTiming } from './session-controller';

// Every utterance takes 1.5 s of fake time. A scripted answer starts 1 s after the mic opens
// and its final transcript arrives 1 s later. Problems: 47+38=85, 26+57=83, 18+75=93, repeating.
const SPEAK_MS = 1500;

function setup(script: ScriptedTurn[], timing: Partial<SessionTiming> = {}) {
  const clock = new FakeClock();
  const speech = new SilentSpeechOutput({ clock, msPerUtterance: SPEAK_MS });
  const input = new ScriptedSpeechInput(clock, script);
  const cues = new RecordingAudioCues();
  const controller = new SessionController(
    {
      clock,
      speechOutput: speech,
      speechInput: input,
      audioCues: cues,
      parser: new StubUtteranceParser(),
      generator: new StubAdditionGenerator(),
      phrases: new StubPhraseBuilder(),
    },
    timing,
  );

  // Record whether the mic was on each time the app started speaking.
  const micOnWhileSpeaking: boolean[] = [];
  const speak = speech.speak.bind(speech);
  speech.speak = (text) => {
    micOnWhileSpeaking.push(input.isListening);
    return speak(text);
  };

  const phases: SessionPhase[] = [];
  controller.subscribe((s) => {
    if (phases[phases.length - 1] !== s.phase) phases.push(s.phase);
  });

  let summary: SessionSummary | null = null;
  /** Starts the session and runs fake time until it ends (or `limitMs` passes). */
  async function run(limitMs = 10 * 60_000): Promise<SessionSummary> {
    void controller.start().then((s) => (summary = s));
    for (let t = 0; t < limitMs && !summary; t += 500) await clock.advanceAsync(500);
    if (!summary) throw new Error('session did not end');
    return summary;
  }

  const ofType = <T extends SessionEvent['type']>(type: T) =>
    controller.events.filter((e): e is Extract<SessionEvent, { type: T }> => e.type === type);

  return { clock, speech, input, cues, controller, phases, micOnWhileSpeaking, run, ofType };
}

/** A short session that ends after the first problem (time is up by the time it is answered). */
const ONE_PROBLEM: Partial<SessionTiming> = { durationMs: 1000 };

describe('SessionController', () => {
  it('chimes on a correct answer and moves to the next problem', async () => {
    const t = setup([{ say: '85' }, { say: '83' }], { durationMs: 4000 });
    const summary = await t.run();

    expect(t.cues.played).toEqual(['correct', 'correct']);
    expect(t.ofType('ask').map((e) => [e.text, e.reason])).toEqual([
      ['47 plus 38', 'new'],
      ['26 plus 57', 'new'],
    ]);
    expect(t.ofType('problem-end').map((e) => [e.outcome, e.given])).toEqual([
      ['correct', 85],
      ['correct', 83],
    ]);
    expect(summary).toMatchObject({ correct: 2, attempted: 2, accuracy: 1, endedBy: 'time-up' });
  });

  it('says the correct answer straight away after a wrong answer, with no retry', async () => {
    const t = setup([{ say: '84' }, { say: '85' }], ONE_PROBLEM);
    await t.run();

    expect(t.speech.spoken).toEqual(['47 plus 38', '85', '0 out of 1, averaging 1 second.']);
    expect(t.cues.played).toEqual([]);
    expect(t.ofType('problem-end')).toEqual([
      expect.objectContaining({ outcome: 'wrong', expected: 85, given: 84, responseMs: 1000 }),
    ]);
    expect(t.input.remainingTurns).toBe(1); // the second answer was never listened for
  });

  it('keeps the mic off whenever the app speaks', async () => {
    const t = setup([{ say: '85' }, { silence: true }, { say: 'mumble' }, { say: 'repeat' }, { say: '80' }, { say: 'skip' }], {
      durationMs: 30_000,
    });
    await t.run();

    expect(t.micOnWhileSpeaking.length).toBeGreaterThan(5);
    expect(t.micOnWhileSpeaking.every((on) => !on)).toBe(true);
    expect(t.input.isListening).toBe(false);
  });

  it('says "sorry, again?" once for unrecognised speech, then accepts an answer', async () => {
    const t = setup([{ say: 'mumble' }, { say: '85', afterMs: 2000 }], ONE_PROBLEM);
    await t.run();

    expect(t.speech.spoken.slice(0, 2)).toEqual(['47 plus 38', SORRY_AGAIN]);
    expect(t.ofType('ask').map((e) => e.reason)).toEqual(['new', 'sorry-again']);
    expect(t.ofType('unrecognised')).toEqual([expect.objectContaining({ transcript: 'mumble', attempt: 1 })]);
    // Timed from the end of "sorry, again?" to the start of the answer.
    expect(t.ofType('problem-end')).toEqual([expect.objectContaining({ outcome: 'correct', responseMs: 2000 })]);
  });

  it('counts a second unrecognised answer as wrong and says the correct answer', async () => {
    const t = setup([{ say: 'mumble' }, { say: 'blah' }], ONE_PROBLEM);
    const summary = await t.run();

    expect(t.ofType('unrecognised').map((e) => e.attempt)).toEqual([1, 2]);
    expect(t.speech.spoken.slice(0, 3)).toEqual(['47 plus 38', SORRY_AGAIN, '85']);
    expect(t.ofType('problem-end')).toEqual([
      expect.objectContaining({ outcome: 'wrong', given: null, responseMs: null }),
    ]);
    expect(t.controller.state.score).toEqual({ correct: 0, attempted: 1 });
    expect(summary.averageResponseMs).toBeNull();
  });

  it('repeats the problem after 10 s of silence and skips it as missed after another 10 s', async () => {
    const t = setup([{ silence: true }, { silence: true }], ONE_PROBLEM);
    await t.run();

    const asks = t.ofType('ask');
    expect(asks.map((e) => [e.text, e.reason, e.at])).toEqual([
      ['47 plus 38', 'new', 0],
      ['47 plus 38', 'silence', SPEAK_MS + 10_000],
    ]);
    const timeouts = t.ofType('silence-timeout');
    expect(timeouts.map((e) => [e.action, e.at])).toEqual([
      ['repeat', SPEAK_MS + 10_000],
      ['skip', 2 * SPEAK_MS + 20_000],
    ]);
    expect(t.ofType('problem-end')).toEqual([
      expect.objectContaining({ outcome: 'missed', given: null, responseMs: null }),
    ]);
    // A missed problem also gets the correct answer, as on the screen.
    expect(t.speech.spoken[2]).toBe('85');
  });

  it('accepts an answer after the silence repeat, timed from the repeated question', async () => {
    const t = setup([{ silence: true }, { say: '85', afterMs: 3000 }], ONE_PROBLEM);
    await t.run();

    expect(t.ofType('problem-end')).toEqual([expect.objectContaining({ outcome: 'correct', responseMs: 3000 })]);
  });

  it('"repeat" re-asks the problem, is not an attempt, and restarts the silence timers', async () => {
    const t = setup(
      [{ silence: true }, { say: 'repeat', afterMs: 4000 }, { silence: true }, { silence: true }],
      ONE_PROBLEM,
    );
    await t.run();

    expect(t.ofType('command').map((e) => e.command)).toEqual(['repeat']);
    expect(t.ofType('ask').map((e) => e.reason)).toEqual(['new', 'silence', 'repeat-command', 'silence']);
    // Without the restart, the silence after "repeat" would skip at once.
    expect(t.ofType('silence-timeout').map((e) => e.action)).toEqual(['repeat', 'repeat', 'skip']);
    expect(t.ofType('problem-end')).toEqual([expect.objectContaining({ outcome: 'missed', responseMs: null })]);
  });

  it("ignores a command's speech-start when timing the answer", async () => {
    const t = setup([{ say: 'repeat', afterMs: 4000 }, { say: '85', afterMs: 1200 }], ONE_PROBLEM);
    await t.run();

    expect(t.ofType('speech-start')).toHaveLength(2);
    expect(t.ofType('problem-end')).toEqual([expect.objectContaining({ outcome: 'correct', responseMs: 1200 })]);
  });

  it('"skip" counts the problem as missed', async () => {
    const t = setup([{ say: 'skip' }, { say: '83' }], { durationMs: 8000 });
    const summary = await t.run();

    expect(t.ofType('command').map((e) => e.command)).toEqual(['skip']);
    expect(t.ofType('problem-end').map((e) => e.outcome)).toEqual(['missed', 'correct']);
    expect(summary).toMatchObject({ correct: 1, attempted: 2 });
  });

  it('times answers from the end of the spoken question to the start of speech, not the final transcript', async () => {
    const t = setup([{ say: '85', afterMs: 2345, durationMs: 3000 }], ONE_PROBLEM);
    await t.run();

    const spoken = t.ofType('question-spoken')[0];
    const start = t.ofType('speech-start')[0];
    expect(spoken.at).toBe(SPEAK_MS);
    expect(start.at - spoken.at).toBe(2345);
    expect(t.ofType('problem-end')[0].responseMs).toBe(2345);
  });

  it('runs a fixed 5-minute session, finishing the problem in progress when time runs out', async () => {
    const answers = ['85', '83', '93'];
    const script: ScriptedTurn[] = Array.from({ length: 200 }, (_, i) => ({ say: answers[i % 3], afterMs: 1700 }));
    const t = setup(script);
    const summary = await t.run();

    const lastAsk = t.ofType('ask').at(-1)!;
    const end = t.ofType('session-end')[0];
    expect(lastAsk.at).toBeLessThan(300_000);
    expect(end.at).toBeGreaterThan(300_000); // the last problem was finished after time ran out
    expect(t.ofType('problem-end')).toHaveLength(t.ofType('ask').length);
    expect(summary).toMatchObject({ correct: t.ofType('ask').length, endedBy: 'time-up' });
    expect(t.controller.state).toMatchObject({ phase: 'summary', timeLeftMs: 0 });
  });

  it('counts down time left for the screen', async () => {
    const t = setup([{ say: '85', afterMs: 9000 }], { durationMs: 5000 });
    const seen: number[] = [];
    t.controller.subscribe((s) => {
      if (seen.at(-1) !== s.timeLeftMs) seen.push(s.timeLeftMs);
    });
    await t.run();

    expect(seen).toEqual([5000, 4000, 3000, 2000, 1000, 0]);
  });

  it('ends with one spoken sentence: score and average time', async () => {
    const t = setup([{ say: '85', afterMs: 1000 }, { say: '80', afterMs: 2000 }, { say: '93', afterMs: 1300 }], {
      durationMs: 10_000,
    });
    const summary = await t.run();

    expect(summary).toMatchObject({ correct: 2, attempted: 3, averageResponseMs: 1433.3333333333333 });
    expect(summary.sentence).toBe('2 out of 3, averaging 1.4 seconds.');
    expect(t.speech.spoken.at(-1)).toBe(summary.sentence);
    expect(t.ofType('session-end')).toEqual([expect.objectContaining({ summary })]);
  });

  it('End stops at once, drops the unfinished problem and goes to the summary', async () => {
    const t = setup([{ say: '85' }, { silence: true }]);
    void t.controller.start();
    await t.clock.advanceAsync(SPEAK_MS + 2000 + SPEAK_MS + 3000); // listening for the second problem
    expect(t.controller.state.phase).toBe('listening');

    t.controller.end();
    await t.clock.advanceAsync(SPEAK_MS);

    expect(t.input.isListening).toBe(false);
    expect(t.controller.state).toMatchObject({ phase: 'summary', score: { correct: 1, attempted: 1 } });
    expect(t.controller.state.summary).toMatchObject({ endedBy: 'user', attempted: 1 });
    expect(t.speech.spoken.at(-1)).toBe('1 out of 1, averaging 1 second.');
    expect(t.clock.pendingCount).toBe(0);
  });

  it('End while the question is being spoken cuts it short', async () => {
    const t = setup([{ say: '85' }]);
    void t.controller.start();
    await t.clock.advanceAsync(500);
    t.controller.end();
    await t.clock.advanceAsync(SPEAK_MS);

    expect(t.ofType('question-spoken')).toEqual([]);
    expect(t.input.calls).not.toContain('start');
    expect(t.controller.state.summary).toMatchObject({ endedBy: 'user', attempted: 0, sentence: '0 out of 0.' });
  });

  it('goes through speaking → listening → feedback → summary', async () => {
    const t = setup([{ say: '85' }], ONE_PROBLEM);
    await t.run();

    expect(t.phases).toEqual(['speaking', 'listening', 'feedback', 'summary']);
  });

  it('shows feedback with the correct answer for a wrong answer', async () => {
    const t = setup([{ say: '84' }], ONE_PROBLEM);
    const feedback: unknown[] = [];
    t.controller.subscribe((s) => s.phase === 'feedback' && feedback.push(s.feedback));
    await t.run();

    expect(feedback[0]).toEqual({ outcome: 'wrong', question: '47 plus 38', correctAnswer: 85 });
  });

  it('ignores non-fatal mic errors and lets the silence timers decide', async () => {
    const t = setup([{ error: 'no-speech', afterMs: 5000 }, { say: '85' }], ONE_PROBLEM);
    await t.run();

    expect(t.ofType('input-error')).toEqual([expect.objectContaining({ code: 'no-speech', fatal: false })]);
    expect(t.ofType('silence-timeout').map((e) => e.action)).toEqual(['repeat']);
    expect(t.ofType('problem-end')[0].outcome).toBe('correct');
  });

  it('stops on a fatal mic error and shows it', async () => {
    const t = setup([{ error: 'not-allowed', fatal: true }]);
    const summary = await t.run();

    expect(summary).toMatchObject({ endedBy: 'mic-error', attempted: 0 });
    expect(t.controller.state.error).toBe('Microphone access was refused.');
    expect(t.ofType('input-error')).toEqual([expect.objectContaining({ code: 'not-allowed', fatal: true })]);
  });

  it('logs every answer, command and timing in the event log', async () => {
    const t = setup([{ say: 'repeat' }, { say: '84' }], ONE_PROBLEM);
    const streamed: SessionEvent[] = [];
    t.controller.onEvent((e) => streamed.push(e));
    await t.run();

    expect(t.controller.events.map((e) => e.type)).toEqual([
      'session-start',
      'ask',
      'question-spoken',
      'listening-start',
      'speech-start',
      'interim',
      'transcript',
      'command',
      'ask',
      'question-spoken',
      'listening-start',
      'speech-start',
      'interim',
      'transcript',
      'problem-end',
      'session-end',
    ]);
    expect(t.ofType('transcript').map((e) => e.parsed)).toEqual([
      { kind: 'command', command: 'repeat' },
      { kind: 'answer', value: 84 },
    ]);
    expect(streamed).toEqual(t.controller.events);
  });

  it('start returns the same session if called twice, and End before start does nothing', async () => {
    const t = setup([{ say: '85' }], ONE_PROBLEM);
    t.controller.end();
    expect(t.controller.state.phase).toBe('idle');
    const a = t.controller.start();
    expect(t.controller.start()).toBe(a);
    await t.clock.advanceAsync(10_000);
    await expect(a).resolves.toMatchObject({ attempted: 1 });
  });
});
