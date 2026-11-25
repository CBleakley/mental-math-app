import type { Command, ParseResult, UtteranceParser } from '../contracts';

/**
 * Parses en-GB transcripts of spoken answers.
 *
 * - Numbers in words ("two hundred and eighty-two"), digit by digit ("two eight two")
 *   or as digits from the recogniser ("282", "85.", "1,282").
 * - Decimals: "nought point five", "point five", "oh point five", "2.50" (= 2.5).
 * - Fillers ("um", "er") are ignored.
 * - Several numbers in one utterance are self-corrections: the last one wins.
 * - "repeat" or "skip" is a command only when no number was spoken.
 */
export class EnGbUtteranceParser implements UtteranceParser {
  parse(transcript: string): ParseResult {
    const words = tokenise(transcript);
    const numbers = readNumbers(classify(words));
    if (numbers.length > 0) {
      return { kind: 'answer', value: numbers[numbers.length - 1] };
    }
    const command = lastCommand(words);
    return command ? { kind: 'command', command } : { kind: 'unrecognised' };
  }
}

const COMMANDS: Record<string, Command> = { repeat: 'repeat', skip: 'skip' };

const FILLERS = new Set(['um', 'umm', 'er', 'erm', 'uh', 'uhm', 'ah', 'hmm', 'mm']);

const DIGITS: Record<string, number> = {
  zero: 0, nought: 0, naught: 0,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
};

const TEENS: Record<string, number> = {
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

const SCALES: Record<string, number> = { hundred: 100, thousand: 1000, million: 1_000_000 };

type Token =
  | { kind: 'digit'; value: number }
  | { kind: 'teen'; value: number }
  | { kind: 'tens'; value: number }
  | { kind: 'scale'; value: number }
  | { kind: 'literal'; value: number }
  | { kind: 'and' }
  | { kind: 'point' }
  | { kind: 'filler' }
  | { kind: 'break' };

function tokenise(transcript: string): string[] {
  return transcript
    .toLowerCase()
    .replace(/(\d),(?=\d{3}\b)/g, '$1') // "1,282" → "1282"
    .replace(/\.(?!\d)/g, ' ') // full stops not followed by a digit ("85.", "skip.")
    .replace(/[^a-z0-9.]+/g, ' ') // hyphens, commas, other punctuation
    .split(' ')
    .filter((w) => w.length > 0);
}

/** Turns words into tokens. "oh" and "a" only count as numbers next to other number words. */
function classify(words: string[]): Token[] {
  const tokens = words.map(classifyWord);
  return tokens.map((token, i) => {
    const word = words[i];
    if (word === 'oh' || word === 'o') {
      return isNumeric(tokens[i - 1]) || isNumeric(tokens[i + 1])
        ? { kind: 'digit', value: 0 }
        : { kind: 'filler' };
    }
    if (word === 'a' || word === 'an') {
      return tokens[i + 1]?.kind === 'scale' ? { kind: 'digit', value: 1 } : { kind: 'filler' };
    }
    return token;
  });
}

function isNumeric(token: Token | undefined): boolean {
  return token !== undefined && ['digit', 'teen', 'tens', 'scale', 'literal', 'point'].includes(token.kind);
}

function classifyWord(word: string): Token {
  if (word in DIGITS) return { kind: 'digit', value: DIGITS[word] };
  if (word in TEENS) return { kind: 'teen', value: TEENS[word] };
  if (word in TENS) return { kind: 'tens', value: TENS[word] };
  if (word in SCALES) return { kind: 'scale', value: SCALES[word] };
  if (word === 'and') return { kind: 'and' };
  if (word === 'point') return { kind: 'point' };
  if (FILLERS.has(word)) return { kind: 'filler' };
  if (/^\d+$/.test(word)) return classifyDigits(Number(word));
  if (/^\d*\.\d+$/.test(word)) return { kind: 'literal', value: Number(word) };
  return { kind: 'break' };
}

/** Recogniser digits behave like the matching words, so "80 5" reads like "eighty five". */
function classifyDigits(value: number): Token {
  if (value < 10) return { kind: 'digit', value };
  if (value < 20) return { kind: 'teen', value };
  if (value < 100 && value % 10 === 0) return { kind: 'tens', value };
  return { kind: 'literal', value };
}

/** One number being read. */
interface Reading {
  /** Digit-by-digit mode ("two eight two"), else compound mode ("two hundred and eighty"). */
  digits: string | null;
  /** Compound mode: thousands and above already closed off. */
  total: number;
  /** Compound mode: the part below the last scale word. */
  current: number;
  /** The fraction digits after "point", or null before it. */
  fraction: string | null;
  last: Token['kind'];
}

function readNumbers(tokens: Token[]): number[] {
  const reader = new NumberReader();
  for (const token of tokens) reader.read(token);
  return reader.done();
}

/** Splits a token stream into numbers, one Reading at a time. */
class NumberReader {
  private numbers: number[] = [];
  private r: Reading | null = null;

  read(token: Token): void {
    if (token.kind === 'filler') return;
    if (this.r?.fraction != null) {
      if (extendFraction(this.r, token)) return;
      this.finish();
    }
    const r = this.r;

    switch (token.kind) {
      case 'break':
        this.finish();
        return;
      case 'and':
        // "two hundred and five" joins; any other "and" separates numbers.
        if (r && r.last === 'scale') r.last = 'and';
        else this.finish();
        return;
      case 'point':
        (r ?? this.start()).fraction = '';
        this.r!.last = 'point';
        return;
      case 'literal':
        this.finish();
        this.numbers.push(token.value);
        return;
      case 'digit':
        if (r && r.digits !== null && r.last === 'digit') {
          r.digits += String(token.value);
        } else if (r && r.digits === null && ['tens', 'scale', 'and'].includes(r.last)) {
          r.current += token.value;
        } else {
          this.finish();
          this.start().digits = String(token.value);
        }
        this.r!.last = 'digit';
        return;
      case 'teen':
      case 'tens':
        if (!(r && r.digits === null && ['scale', 'and'].includes(r.last))) {
          this.finish();
        }
        (this.r ?? this.start()).current += token.value;
        this.r!.last = token.kind;
        return;
      case 'scale':
        this.scale(token.value);
        return;
    }
  }

  done(): number[] {
    this.finish();
    return this.numbers;
  }

  private scale(scale: number): void {
    let r = this.r;
    if (r && r.digits !== null) {
      // "two hundred" starts in digit mode; switch to compound.
      r.current = Number(r.digits);
      r.digits = null;
    }
    const startsNew =
      scale === 100
        ? r !== null && (r.last === 'scale' || r.last === 'and' || r.current >= 100)
        : r !== null && (r.last === 'and' || r.current === 0);
    if (startsNew) {
      this.finish();
      r = null;
    }
    if (!r) {
      // A bare scale word: "hundred" = 100.
      r = this.start();
      r.current = 1;
    }
    if (scale === 100) {
      r.current *= 100;
    } else {
      r.total = (r.total + r.current) * scale;
      r.current = 0;
    }
    r.last = 'scale';
  }

  private start(): Reading {
    this.r = { digits: null, total: 0, current: 0, fraction: null, last: 'break' };
    return this.r;
  }

  private finish(): void {
    if (this.r) this.numbers.push(valueOf(this.r));
    this.r = null;
  }
}

/** After "point", digits are read one by one; "point twenty five" is also accepted. */
function extendFraction(r: Reading, token: Token): boolean {
  const fraction = r.fraction ?? '';
  if (token.kind === 'digit') {
    r.fraction = r.last === 'tens' ? fraction.slice(0, -1) + String(token.value) : fraction + String(token.value);
    r.last = 'digit';
    return true;
  }
  if (token.kind === 'teen' || token.kind === 'tens') {
    r.fraction = fraction + String(token.value);
    r.last = token.kind;
    return true;
  }
  return false;
}

function valueOf(r: Reading): number {
  const whole = r.digits !== null ? r.digits : String(r.total + r.current);
  return r.fraction ? Number(`${whole}.${r.fraction}`) : Number(whole);
}

function lastCommand(words: string[]): Command | null {
  for (let i = words.length - 1; i >= 0; i--) {
    const command = COMMANDS[words[i]];
    if (command) return command;
  }
  return null;
}
