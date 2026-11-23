import type { Millis } from './clock';
import type { Operation } from './problem';
import type { ProblemOutcome } from './session-state';

// Shape only: no implementation in M1. Progress stays on the device.

export interface ProblemRecord {
  problemId: string;
  operation: Operation;
  rung: number;
  outcome: ProblemOutcome;
  responseMs: Millis | null;
  /** Wall-clock time (ms since epoch) the problem ended. */
  answeredAt: number;
}

export interface Settings {
  voiceId: string | null;
}

export interface ProgressStore {
  loadSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;
  addRecords(records: readonly ProblemRecord[]): Promise<void>;
  /** Most recent first. */
  recentRecords(operation: Operation, limit: number): Promise<ProblemRecord[]>;
  getRung(operation: Operation): Promise<number>;
  setRung(operation: Operation, rung: number): Promise<void>;
}
