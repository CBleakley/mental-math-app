# M1-08 Addition generator (rung 1) and phrase builder

- **Status:** todo
- **Wave:** 3
- **Depends on:** M1-02
- **Unblocks:** M1-11 (M1-09 uses a stub until this lands)

## Goal

Endless 2-digit plus 2-digit problems that always carry.

## Scope

- Generator for rung 1 only: the units digits sum to 10 or more.
- Phrase builder giving plain wording, e.g. "47 plus 38".
- Seedable randomness so tests are repeatable.

## Done when

- [ ] Tests prove every problem in 1,000 draws has two 2-digit operands, a carry and the right answer.
- [ ] Phrases match the plain wording rule.
