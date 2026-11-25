import { buildSummary, summarySentence } from './summary';

describe('summarySentence', () => {
  it.each([
    [18, 22, 3100, '18 out of 22, averaging 3.1 seconds.'],
    [5, 5, 2000, '5 out of 5, averaging 2 seconds.'],
    [1, 1, 1040, '1 out of 1, averaging 1 second.'],
    [0, 3, null, '0 out of 3.'],
    [0, 0, null, '0 out of 0.'],
  ])('%i/%i at %p ms → %s', (correct, attempted, avg, sentence) => {
    expect(summarySentence(correct, attempted, avg)).toBe(sentence);
  });
});

describe('buildSummary', () => {
  it('averages response time over answered problems only', () => {
    const summary = buildSummary(
      [
        { outcome: 'correct', responseMs: 2000 },
        { outcome: 'wrong', responseMs: 4000 },
        { outcome: 'missed', responseMs: null },
      ],
      'user',
    );
    expect(summary).toEqual({
      correct: 1,
      attempted: 3,
      accuracy: 1 / 3,
      averageResponseMs: 3000,
      endedBy: 'user',
      sentence: '1 out of 3, averaging 3 seconds.',
    });
  });

  it('has zero accuracy and no average when nothing was attempted', () => {
    expect(buildSummary([], 'time-up')).toMatchObject({ accuracy: 0, averageResponseMs: null });
  });
});
