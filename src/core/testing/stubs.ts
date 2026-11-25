import type { ParseResult, PhraseBuilder, Problem, ProblemGenerator, UtteranceParser } from '../contracts';

// Minimal stand-ins so the session controller can be tested before the real parser (M1-07)
// and generator (M1-08) land. They are deliberately simple: digits and two command words.

/** Understands digit strings ("85", "85."), "repeat" and "skip". The last number wins. */
export class StubUtteranceParser implements UtteranceParser {
  parse(transcript: string): ParseResult {
    const text = transcript.trim().toLowerCase();
    if (text === 'repeat') return { kind: 'command', command: 'repeat' };
    if (text === 'skip') return { kind: 'command', command: 'skip' };
    const numbers = text.match(/\d+(\.\d+)?/g);
    if (!numbers) return { kind: 'unrecognised' };
    return { kind: 'answer', value: Number(numbers[numbers.length - 1]) };
  }
}

/** Hands out the given addition problems in order, cycling when they run out. */
export class StubAdditionGenerator implements ProblemGenerator {
  readonly operation = 'addition' as const;
  readonly rung = 1;
  private index = 0;

  constructor(private readonly pairs: readonly (readonly [number, number])[] = [[47, 38], [26, 57], [18, 75]]) {}

  next(): Problem {
    const [a, b] = this.pairs[this.index++ % this.pairs.length];
    return { id: `addition:${a}+${b}`, operation: 'addition', rung: 1, operands: [a, b], answer: a + b };
  }
}

/** "47 plus 38" / "85". */
export class StubPhraseBuilder implements PhraseBuilder {
  question(problem: Problem): string {
    return problem.operands.join(' plus ');
  }

  answer(problem: Problem): string {
    return String(problem.answer);
  }
}
