import type { Millis } from '../core/contracts';

/** Time left as m:ss, rounding up so the clock reads 0:00 only when time is up. */
export function formatClock(ms: Millis): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Share of the session used, 0 to 1. */
export function timeUsedFraction(timeLeftMs: Millis, durationMs: Millis): number {
  if (durationMs <= 0) return 1;
  const used = 1 - timeLeftMs / durationMs;
  return Math.min(1, Math.max(0, used));
}

/** Average response time, e.g. "3.1s"; a dash when nothing was answered. */
export function formatSeconds(ms: Millis | null): string {
  if (ms === null) return '—';
  return `${(ms / 1000).toFixed(1)}s`;
}

/** 0.818 → "82%". */
export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
