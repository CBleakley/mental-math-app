import { add } from './sample';

describe('sample', () => {
  it('adds two numbers', () => {
    expect(add(47, 38)).toBe(85);
  });
});
