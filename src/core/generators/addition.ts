import type { Problem, ProblemGenerator } from '../contracts';
import { randomInt, type Random } from '../random';

/** Every pair of units digits whose sum is 10 or more, i.e. that carries. */
const CARRYING_UNITS: readonly (readonly [number, number])[] = (() => {
  const pairs: [number, number][] = [];
  for (let a = 1; a <= 9; a++) {
    for (let b = 1; b <= 9; b++) {
      if (a + b >= 10) pairs.push([a, b]);
    }
  }
  return pairs;
})();

/**
 * Addition rung 1: 2-digit plus 2-digit where the units digits carry, e.g. 47 + 38.
 * Draws uniformly from all such problems.
 */
export function createAdditionRung1Generator(random: Random = Math.random): ProblemGenerator {
  return {
    operation: 'addition',
    rung: 1,
    next(): Problem {
      const [unitsA, unitsB] = CARRYING_UNITS[randomInt(random, 0, CARRYING_UNITS.length - 1)];
      const a = randomInt(random, 1, 9) * 10 + unitsA;
      const b = randomInt(random, 1, 9) * 10 + unitsB;
      return {
        id: `addition:${a}+${b}`,
        operation: 'addition',
        rung: 1,
        operands: [a, b],
        answer: a + b,
      };
    },
  };
}
