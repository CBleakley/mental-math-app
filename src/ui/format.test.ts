import { formatClock, formatPercent, formatSeconds, timeUsedFraction } from './format';

describe('formatClock', () => {
  it('shows minutes and padded seconds', () => {
    expect(formatClock(5 * 60_000)).toBe('5:00');
    expect(formatClock(184_000)).toBe('3:04');
    expect(formatClock(9_000)).toBe('0:09');
  });

  it('rounds part seconds up and never goes below zero', () => {
    expect(formatClock(183_001)).toBe('3:04');
    expect(formatClock(1)).toBe('0:01');
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(-500)).toBe('0:00');
  });
});

describe('timeUsedFraction', () => {
  it('is the share of the session used', () => {
    expect(timeUsedFraction(300_000, 300_000)).toBe(0);
    expect(timeUsedFraction(150_000, 300_000)).toBe(0.5);
    expect(timeUsedFraction(0, 300_000)).toBe(1);
  });

  it('stays between 0 and 1', () => {
    expect(timeUsedFraction(-1, 300_000)).toBe(1);
    expect(timeUsedFraction(400_000, 300_000)).toBe(0);
    expect(timeUsedFraction(0, 0)).toBe(1);
  });
});

describe('formatSeconds', () => {
  it('shows one decimal place', () => {
    expect(formatSeconds(3_140)).toBe('3.1s');
    expect(formatSeconds(0)).toBe('0.0s');
  });

  it('shows a dash when nothing was answered', () => {
    expect(formatSeconds(null)).toBe('—');
  });
});

describe('formatPercent', () => {
  it('rounds to a whole percent', () => {
    expect(formatPercent(18 / 22)).toBe('82%');
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(1)).toBe('100%');
  });
});
