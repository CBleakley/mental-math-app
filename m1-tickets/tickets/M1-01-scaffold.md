# M1-01 Scaffold the project

- **Status:** done
- **Wave:** 1 (critical path)
- **Depends on:** nothing
- **Unblocks:** M1-02, M1-03

## Goal

An empty app that runs in Chrome and has a passing test.

## Scope

- GitHub repo, with this `tickets/` folder committed.
- Expo app in TypeScript with web enabled.
- Jest as the test runner (Expo default).
- Folders `src/core`, `src/adapters/web`, `src/ui`.
- A lint rule that stops `src/core` importing React, Expo or browser APIs.

## Done when

- [x] `npm test` passes one sample test.
- [x] `npx expo start --web` shows a placeholder page.
- [x] The lint rule fails on a deliberate bad import into `src/core`.
