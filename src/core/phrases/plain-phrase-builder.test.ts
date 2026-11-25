import type { Problem } from '../contracts';
import { createAdditionRung1Generator } from '../generators/addition';
import { createSeededRandom } from '../random';
import { plainPhraseBuilder } from './plain-phrase-builder';

const problem: Problem = {
  id: 'addition:47+38',
  operation: 'addition',
  rung: 1,
  operands: [47, 38],
  answer: 85,
};

describe('plain phrase builder', () => {
  it('words an addition question plainly', () => {
    expect(plainPhraseBuilder.question(problem)).toBe('47 plus 38');
  });

  it('says the answer as a number', () => {
    expect(plainPhraseBuilder.answer(problem)).toBe('85');
  });

  it('uses the "<a> plus <b>" form for every generated problem', () => {
    const generator = createAdditionRung1Generator(createSeededRandom(5));
    for (let i = 0; i < 200; i++) {
      const p = generator.next();
      expect(plainPhraseBuilder.question(p)).toMatch(/^\d{2} plus \d{2}$/);
      expect(plainPhraseBuilder.question(p)).toBe(`${p.operands[0]} plus ${p.operands[1]}`);
      expect(plainPhraseBuilder.answer(p)).toBe(String(p.operands[0] + p.operands[1]));
    }
  });
});
