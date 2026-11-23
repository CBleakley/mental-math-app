# M1-11 Wire-up

- **Status:** todo
- **Wave:** 4 (critical path)
- **Depends on:** M1-03, M1-04, M1-05, M1-06, M1-07, M1-08, M1-09, M1-10
- **Unblocks:** M1-12

## Goal

One tap starts a real voice session on the deployed site.

## Scope

- Composition root: plug the web adapters, parser and generator into the controller, and the controller into the screens.
- The Start tap unlocks audio and asks for the microphone.
- Screen wake lock during a session.
- Remember the chosen voice in browser storage on the device; nothing leaves the device.
- A hidden debug view or download of the session event log.

## Done when

- [ ] A full 5-minute session runs in Chrome on Windows with no taps after Start.
