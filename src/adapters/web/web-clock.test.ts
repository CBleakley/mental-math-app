import { WebClock } from './web-clock';

describe('WebClock', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('reads performance.now()', () => {
    const spy = jest.spyOn(performance, 'now').mockReturnValue(1234.5);
    expect(new WebClock().now()).toBe(1234.5);
    spy.mockRestore();
  });

  it('runs scheduled callbacks after the delay unless cancelled', () => {
    const clock = new WebClock();
    const kept = jest.fn();
    const dropped = jest.fn();
    clock.schedule(100, kept);
    const cancel = clock.schedule(100, dropped);
    cancel();
    jest.advanceTimersByTime(99);
    expect(kept).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(kept).toHaveBeenCalledTimes(1);
    expect(dropped).not.toHaveBeenCalled();
  });
});
