import { createSeededRandom, randomInt } from './random';

describe('seeded random', () => {
  it('gives the same sequence for the same seed', () => {
    const a = createSeededRandom(123);
    const b = createSeededRandom(123);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
  });

  it('stays in [0, 1)', () => {
    const random = createSeededRandom(9);
    for (let i = 0; i < 1000; i++) {
      const x = random();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('randomInt covers both ends inclusively', () => {
    const random = createSeededRandom(1);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(randomInt(random, 1, 9));
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
