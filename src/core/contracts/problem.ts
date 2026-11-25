/** Topics. Only addition in M1; the others are added with their milestones. */
export type Operation = 'addition';

export interface Problem {
  /**
   * Identifies the same problem across sessions, for scheduling later,
   * e.g. 'addition:47+38'. Equal problems have equal ids.
   */
  id: string;
  operation: Operation;
  /** Difficulty rung within the operation's ladder, from 1. */
  rung: number;
  /** In the order they are spoken. */
  operands: readonly number[];
  answer: number;
}

/** Makes problems for one operation at one rung. Seedable implementations keep tests repeatable. */
export interface ProblemGenerator {
  readonly operation: Operation;
  readonly rung: number;
  next(): Problem;
}

/** Plain spoken wording, e.g. "47 plus 38". */
export interface PhraseBuilder {
  /** The question, e.g. "47 plus 38". */
  question(problem: Problem): string;
  /** The correct answer as said after a wrong answer, e.g. "85". */
  answer(problem: Problem): string;
}
