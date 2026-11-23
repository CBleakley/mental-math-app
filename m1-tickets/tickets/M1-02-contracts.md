# M1-02 Contracts, core types and fakes

- **Status:** todo
- **Wave:** 2 (critical path)
- **Depends on:** M1-01
- **Unblocks:** M1-04, M1-05, M1-06, M1-07, M1-08, M1-09, M1-10

## Goal

Every wave 3 ticket can be built against agreed shapes without waiting on the others.

## Scope

Interfaces:

- **SpeechOutput:** list voices, pick a voice, `speak(text)` that resolves when speech has finished, `stop()`.
- **SpeechInput:** start/stop listening; emits a speech-start timestamp and the final transcript.
- **AudioCues:** `play(chime)`.
- **ProgressStore:** shape only; no implementation in M1.
- **Clock:** `now()`.

Core types:

- Problem, ProblemGenerator, PhraseBuilder.
- UtteranceParser and its result: answer, command (repeat, skip) or unrecognised.
- SessionState: the view model the screens render (phase, time left, score, last correct answer, summary).
- Session event log entries, for measurement in M1-12.

Fakes, for tests:

- Scripted SpeechInput, silent SpeechOutput, recording AudioCues, controllable Clock.

Also the real web Clock adapter (trivial).

## Done when

- [ ] Types compile and fakes have their own small tests.
- [ ] Contracts are reviewed before wave 3 starts.
