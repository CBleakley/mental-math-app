# CLAUDE.md

Hands-free, voice-driven mental maths trainer. Expo + React Native, TypeScript throughout. Web prototype first (Safari on iPhone), native iOS later.

## Commands
- `npx expo start --web` — dev server (quick checks in Chrome on Windows; real test is Safari on iPhone)
- `npm test` — Jest
- Deploy: push to GitHub → Netlify auto-deploys (HTTPS needed for mic)

## Architecture
Three layers. Core depends only on interfaces; adapters are plugged in once at app start.

**Core** (pure TS, fully unit-tested): session controller (state machine: ask → listen → judge → feedback → next), problem generators (one per operation, each a ladder of rungs), difficulty engine, scheduler, utterance parser, method explainer, phrase builder.

**Interfaces:** `SpeechOutput` (speak, stop, list/pick voices), `SpeechInput` (start/stop; emits speech-start timestamp + final transcript), `AudioCues` (play chime), `ProgressStore` (per-problem history, levels, settings), `Clock`.

**Web adapters:** speechSynthesis, SpeechRecognition, Web Audio, IndexedDB/localStorage. iOS later swaps in expo-speech, expo-speech-recognition, expo-audio, SQLite/AsyncStorage (needs a dev build, not Expo Go).

## Rules
- Core never imports React, Expo or browser APIs.
- Generators, parser and explainer must each be replaceable independently.
- Use fake adapters (scripted transcripts, silent speech, fake clock) so the full loop runs in tests.
- UI stays thin: one screen, operation toggle, Start, on-screen score + time left.
- Progress stays on-device. Nothing is sent off the device.

## Behaviour spec
- Speech recognition locale: `en-GB` (parse "nought point five" → 0.5).
- Commands: repeat, skip, harder, easier.
- Mic off while the app speaks; no barge-in.
- ~1 s silence ends an answer; self-corrections take the last number spoken.
- No answer in 10 s → repeat once; another 10 s → skip, counted as missed.
- Unparseable speech → "sorry, again?" once; second miss counts as wrong.
- Wrong answer → say correct answer + one-sentence quick method; no retry.
- Response time = end of spoken question → start of answer.
- Difficulty: accuracy only, hold ~85% over last ~20 problems, per operation.
- Scheduling: misses, and correct answers slower than 1.5× median at that level, return sooner.
- Session: fixed 5 min, finish current problem; end with one spoken sentence (score, avg time, level change).
- Wording is plain: "47 plus 38", "15% of 340", "93 divided by 4".
- Keep screen on (wake lock).

## Current milestone: voice loop prototype (web)
Addition only, first rung (2-digit + 2-digit with carrying). Session controller with repeat/skip, voice picker, Start button. Out of scope: other operations, difficulty engine, spaced repetition, storage, method explanations. Done when a 5-min session runs hands-free reliably on iPhone Safari.

## Decision boundary
Decide small technical details yourself (library versions, file layout, naming). Ask Conor before anything that changes how the app behaves, sounds or feels, costs money, or sends data off the device.
