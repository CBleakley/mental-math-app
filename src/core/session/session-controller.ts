import type {
  AskReason,
  AudioCues,
  Cancel,
  Clock,
  Feedback,
  Millis,
  ParseResult,
  PhraseBuilder,
  Problem,
  ProblemGenerator,
  SessionEvent,
  SessionState,
  SessionSummary,
  SpeechInput,
  SpeechInputErrorCode,
  SpeechOutput,
  UtteranceParser,
} from '../contracts';
import { buildSummary, type FinishedProblem } from './summary';

export interface SessionControllerDeps {
  clock: Clock;
  speechOutput: SpeechOutput;
  speechInput: SpeechInput;
  audioCues: AudioCues;
  parser: UtteranceParser;
  generator: ProblemGenerator;
  phrases: PhraseBuilder;
}

export interface SessionTiming {
  /** Session length. Default 5 minutes. */
  durationMs: Millis;
  /** Silence before the question is repeated, and again before it is skipped. Default 10 s. */
  silenceMs: Millis;
  /** How often `timeLeftMs` is refreshed for the screen. Default 1 s. */
  tickMs: Millis;
}

export const DEFAULT_TIMING: SessionTiming = { durationMs: 5 * 60_000, silenceMs: 10_000, tickMs: 1000 };

/** Said once when an answer can't be understood. */
export const SORRY_AGAIN = 'Sorry, again?';

export type StateListener = (state: SessionState) => void;
export type EventListener = (event: SessionEvent) => void;

/** How one listening turn ended. */
type Turn =
  | { kind: 'final'; transcript: string; parsed: ParseResult; speechStartAt: Millis | null; finalAt: Millis }
  | { kind: 'silence' }
  | { kind: 'fatal'; code: SpeechInputErrorCode; message?: string }
  | { kind: 'stopped' };

interface ProblemResult extends FinishedProblem {
  given: number | null;
}

const ERROR_TEXT: Record<SpeechInputErrorCode, string> = {
  'not-allowed': 'Microphone access was refused.',
  'no-speech': 'No speech was heard.',
  'audio-capture': 'The microphone could not be used.',
  unavailable: 'Speech recognition is not available.',
  other: 'Speech recognition stopped working.',
};

function idleState(durationMs: Millis): SessionState {
  return {
    phase: 'idle',
    durationMs,
    timeLeftMs: durationMs,
    score: { correct: 0, attempted: 0 },
    question: null,
    feedback: null,
    summary: null,
    error: null,
  };
}

/**
 * The hands-free loop: ask → listen → judge → feedback → next, for a fixed session length.
 *
 * Screens subscribe to SessionState; everything that happens is also emitted as SessionEvents
 * for the event log. The mic is only on while listening, never while the app speaks.
 */
export class SessionController {
  private readonly timing: SessionTiming;
  private current: SessionState;
  private readonly log: SessionEvent[] = [];
  private readonly stateListeners = new Set<StateListener>();
  private readonly eventListeners = new Set<EventListener>();

  private started = false;
  /** Set once the session is over (or ending); every await checks it. */
  private finished = false;
  private timeUp = false;
  private endedBy: SessionSummary['endedBy'] = 'time-up';
  private endsAt: Millis = 0;
  private cancelTimers: Cancel[] = [];
  private finishedProblems: ProblemResult[] = [];
  /** Ends the listening turn in progress, if any. */
  private abortTurn: (() => void) | null = null;
  private done: Promise<SessionSummary> | null = null;

  constructor(
    private readonly deps: SessionControllerDeps,
    timing: Partial<SessionTiming> = {},
  ) {
    this.timing = { ...DEFAULT_TIMING, ...timing };
    this.current = idleState(this.timing.durationMs);
  }

  get state(): SessionState {
    return this.current;
  }

  /** The event log so far. */
  get events(): readonly SessionEvent[] {
    return this.log;
  }

  /** Calls `listener` on every state change. Returns an unsubscribe function. */
  subscribe(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  /** Calls `listener` for every event-log entry. Returns an unsubscribe function. */
  onEvent(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Starts the session. Resolves with the summary once the closing sentence has been spoken.
   * Calling it again returns the same promise. A controller runs one session only.
   */
  start(): Promise<SessionSummary> {
    if (!this.done) {
      this.started = true;
      this.done = this.run();
    }
    return this.done;
  }

  /** The End button: abandons the current problem (it is not counted) and goes to the summary. */
  end(): void {
    if (!this.started || this.finished) return;
    this.finished = true;
    this.endedBy = 'user';
    this.deps.speechOutput.stop();
    this.abortTurn?.();
  }

  private async run(): Promise<SessionSummary> {
    const { clock } = this.deps;
    const start = clock.now();
    this.endsAt = start + this.timing.durationMs;
    this.emit({ type: 'session-start', at: start, durationMs: this.timing.durationMs });
    this.cancelTimers.push(
      clock.schedule(this.timing.durationMs, () => {
        this.timeUp = true;
        this.setState({ timeLeftMs: 0 });
      }),
    );
    this.scheduleTick();

    while (!this.finished && !this.timeUp) {
      const problem = this.deps.generator.next();
      const result = await this.runProblem(problem);
      if (!result) break;
      await this.giveFeedback(problem, result);
    }
    return this.finish();
  }

  private scheduleTick(): void {
    const cancel = this.deps.clock.schedule(this.timing.tickMs, () => {
      if (this.finished || this.timeUp) return;
      this.setState({ timeLeftMs: Math.max(0, this.endsAt - this.deps.clock.now()) });
      this.scheduleTick();
    });
    this.cancelTimers.push(cancel);
  }

  /** Asks one problem until it is answered, skipped or missed. Null if the session stopped mid-problem. */
  private async runProblem(problem: Problem): Promise<ProblemResult | null> {
    const question = this.deps.phrases.question(problem);
    let reason: AskReason = 'new';
    let silences = 0;
    let unrecognised = 0;
    const missed: ProblemResult = { outcome: 'missed', given: null, responseMs: null };

    for (;;) {
      const questionEndAt = await this.say(problem, reason === 'sorry-again' ? SORRY_AGAIN : question, reason, question);
      if (this.finished) return null;

      const turn = await this.listen(problem);
      if (turn.kind === 'stopped') return null;
      if (turn.kind === 'fatal') {
        this.finished = true;
        this.endedBy = 'mic-error';
        this.setState({ error: ERROR_TEXT[turn.code] });
        return null;
      }

      const at = this.deps.clock.now();
      if (turn.kind === 'silence') {
        const action = silences === 0 ? 'repeat' : 'skip';
        this.emit({ type: 'silence-timeout', at, problemId: problem.id, action });
        if (action === 'skip') return missed;
        silences++;
        reason = 'silence';
        continue;
      }

      const { parsed } = turn;
      if (parsed.kind === 'command') {
        // Not an attempt: its speech-start is not an answer time, and the silence timers restart.
        this.emit({ type: 'command', at, problemId: problem.id, command: parsed.command });
        if (parsed.command === 'skip') return missed;
        silences = 0;
        reason = 'repeat-command';
        continue;
      }

      if (parsed.kind === 'unrecognised') {
        unrecognised++;
        const attempt = unrecognised === 1 ? 1 : 2;
        this.emit({ type: 'unrecognised', at, problemId: problem.id, transcript: turn.transcript, attempt });
        if (attempt === 2) return { outcome: 'wrong', given: null, responseMs: null };
        silences = 0;
        reason = 'sorry-again';
        continue;
      }

      const answerStart = turn.speechStartAt ?? turn.finalAt;
      return {
        outcome: parsed.value === problem.answer ? 'correct' : 'wrong',
        given: parsed.value,
        responseMs: Math.max(0, answerStart - questionEndAt),
      };
    }
  }

  /** Speaks with the mic off. Returns when speech finished: the start of the response window. */
  private async say(problem: Problem, text: string, reason: AskReason, question: string): Promise<Millis> {
    const { clock, speechInput, speechOutput } = this.deps;
    speechInput.stop();
    this.setState({ phase: 'speaking', question, feedback: null });
    this.emit({ type: 'ask', at: clock.now(), problemId: problem.id, text, reason });
    await speechOutput.speak(text);
    const at = clock.now();
    if (!this.finished) this.emit({ type: 'question-spoken', at, problemId: problem.id });
    return at;
  }

  /** One mic turn, ended by a final transcript, the silence timer, a fatal error or `end`. */
  private listen(problem: Problem): Promise<Turn> {
    const { clock, speechInput, parser } = this.deps;
    const problemId = problem.id;
    this.setState({ phase: 'listening' });
    this.emit({ type: 'listening-start', at: clock.now(), problemId });

    return new Promise<Turn>((resolve) => {
      let speechStartAt: Millis | null = null;
      let cancelSilence: Cancel = () => {};
      let settled = false;

      const settle = (turn: Turn, stopMic: boolean) => {
        if (settled) return;
        settled = true;
        cancelSilence();
        this.abortTurn = null;
        if (stopMic) speechInput.stop();
        resolve(turn);
      };
      // Speaking resets the silence timer, so a long answer is not cut off; if no final ever
      // arrives, the timer still fires and the session cannot hang.
      const armSilence = () => {
        cancelSilence();
        cancelSilence = clock.schedule(this.timing.silenceMs, () => settle({ kind: 'silence' }, true));
      };

      this.abortTurn = () => settle({ kind: 'stopped' }, true);
      armSilence();

      speechInput.start((event) => {
        if (settled) return;
        switch (event.type) {
          case 'speech-start':
            speechStartAt = event.at;
            this.emit({ type: 'speech-start', at: event.at, problemId });
            armSilence();
            break;
          case 'interim':
            this.emit({ type: 'interim', at: event.at, problemId, transcript: event.transcript });
            break;
          case 'final': {
            const parsed = parser.parse(event.transcript);
            this.emit({ type: 'transcript', at: event.at, problemId, transcript: event.transcript, parsed });
            settle({ kind: 'final', transcript: event.transcript, parsed, speechStartAt, finalAt: event.at }, false);
            break;
          }
          case 'error':
            this.emit({
              type: 'input-error',
              at: event.at,
              problemId,
              code: event.code,
              fatal: event.fatal,
              ...(event.message !== undefined && { message: event.message }),
            });
            if (event.fatal) settle({ kind: 'fatal', code: event.code, message: event.message }, false);
            break;
        }
      });
    });
  }

  /** Records the result, then chimes (correct) or says the correct answer (wrong or missed). */
  private async giveFeedback(problem: Problem, result: ProblemResult): Promise<void> {
    const { clock, audioCues, speechOutput, phrases } = this.deps;
    this.finishedProblems.push(result);
    const question = phrases.question(problem);
    const feedback: Feedback =
      result.outcome === 'correct'
        ? { outcome: 'correct' }
        : { outcome: result.outcome, question, correctAnswer: problem.answer };
    this.setState({
      phase: 'feedback',
      feedback,
      score: {
        correct: this.current.score.correct + (result.outcome === 'correct' ? 1 : 0),
        attempted: this.current.score.attempted + 1,
      },
    });
    this.emit({
      type: 'problem-end',
      at: clock.now(),
      problemId: problem.id,
      outcome: result.outcome,
      expected: problem.answer,
      given: result.given,
      responseMs: result.responseMs,
    });
    if (result.outcome === 'correct') await audioCues.play('correct');
    else await speechOutput.speak(phrases.answer(problem));
  }

  private async finish(): Promise<SessionSummary> {
    this.finished = true;
    for (const cancel of this.cancelTimers) cancel();
    this.cancelTimers = [];
    this.deps.speechInput.stop();
    const summary = buildSummary(this.finishedProblems, this.endedBy);
    this.setState({
      phase: 'summary',
      question: null,
      feedback: null,
      summary,
      timeLeftMs: Math.max(0, this.endsAt - this.deps.clock.now()),
    });
    this.emit({ type: 'session-end', at: this.deps.clock.now(), summary });
    await this.deps.speechOutput.speak(summary.sentence);
    return summary;
  }

  private setState(patch: Partial<SessionState>): void {
    this.current = { ...this.current, ...patch };
    for (const listener of this.stateListeners) listener(this.current);
  }

  private emit(event: SessionEvent): void {
    this.log.push(event);
    for (const listener of this.eventListeners) listener(event);
  }
}
