import type { Operation, PhraseBuilder, Problem } from '../contracts';

/** Spoken word between operands, per operation. */
const OPERATOR_WORDS: Record<Operation, string> = {
  addition: 'plus',
};

/** Plain wording: numerals joined by the operator word, e.g. "47 plus 38". */
export const plainPhraseBuilder: PhraseBuilder = {
  question(problem: Problem): string {
    return problem.operands.join(` ${OPERATOR_WORDS[problem.operation]} `);
  },
  answer(problem: Problem): string {
    return String(problem.answer);
  },
};
