import { createSeededRandom } from '../random';
import { createAdditionRung1Generator } from './addition';

describe('addition rung 1 generator', () => {
  const draws = (seed: number, n: number) => {
    const generator = createAdditionRung1Generator(createSeededRandom(seed));
    return Array.from({ length: n }, () => generator.next());
  };

  it('identifies itself as addition rung 1', () => {
    const generator = createAdditionRung1Generator(createSeededRandom(1));
    expect(generator.operation).toBe('addition');
    expect(generator.rung).toBe(1);
  });

  it('gives two 2-digit operands that carry and the right answer in 1,000 draws', () => {
    for (const problem of draws(42, 1000)) {
      expect(problem.operation).toBe('addition');
      expect(problem.rung).toBe(1);
      expect(problem.operands).toHaveLength(2);
      const [a, b] = problem.operands;
      for (const operand of [a, b]) {
        expect(Number.isInteger(operand)).toBe(true);
        expect(operand).toBeGreaterThanOrEqual(10);
        expect(operand).toBeLessThanOrEqual(99);
      }
      expect((a % 10) + (b % 10)).toBeGreaterThanOrEqual(10);
      expect(problem.answer).toBe(a + b);
      expect(problem.id).toBe(`addition:${a}+${b}`);
    }
  });

  it('repeats the same problems for the same seed', () => {
    expect(draws(7, 50)).toEqual(draws(7, 50));
  });

  it('varies with the seed', () => {
    expect(draws(7, 50)).not.toEqual(draws(8, 50));
  });

  it('covers the whole range rather than a few problems', () => {
    const problems = draws(3, 1000);
    const ids = new Set(problems.map((p) => p.id));
    expect(ids.size).toBeGreaterThan(500);
    const firsts = problems.map((p) => p.operands[0]);
    expect(Math.min(...firsts)).toBeLessThan(20);
    expect(Math.max(...firsts)).toBeGreaterThan(90);
  });

  it('stays valid at the edges of the random source', () => {
    for (const value of [0, 0.999999999]) {
      const problem = createAdditionRung1Generator(() => value).next();
      const [a, b] = problem.operands;
      expect(a).toBeGreaterThanOrEqual(10);
      expect(b).toBeLessThanOrEqual(99);
      expect((a % 10) + (b % 10)).toBeGreaterThanOrEqual(10);
    }
  });
});
