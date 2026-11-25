# M1-07 Utterance parser

- **Status:** done
- **Wave:** 3
- **Depends on:** M1-02
- **Unblocks:** M1-11 (M1-09 uses a stub until this lands)

## Goal

Turn a transcript into an answer, a command or "unrecognised".

## Scope

- Spoken whole numbers: "two hundred and eighty-two", "two eight two", "282".
- Decimals: "nought point five", "point five", "oh" and "zero".
- Fillers: "um", "er".
- Self-corrections: take the last number spoken.
- Trailing zeros ignored (2.50 = 2.5).
- Commands: repeat, skip.

## Done when

- [x] A table-driven Jest suite covers every form above plus common recogniser outputs ("85", "eighty five", "85.") and passes.
