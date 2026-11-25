/** Spoken commands. Difficulty is automatic, so there are only these two. */
export type Command = 'repeat' | 'skip';

export type ParseResult =
  /** A number. Self-corrections already resolved to the last number spoken. */
  | { kind: 'answer'; value: number }
  | { kind: 'command'; command: Command }
  | { kind: 'unrecognised' };

/** Turns a final transcript (en-GB) into an answer, a command or "unrecognised". */
export interface UtteranceParser {
  parse(transcript: string): ParseResult;
}
