# M1-10 Screens

- **Status:** todo
- **Wave:** 3
- **Depends on:** M1-02
- **Unblocks:** M1-11

## Goal

The screens from the design canvas, driven only by SessionState.

## Scope

Designs: https://claude.ai/artifact/24bQQafT5F8GLjktMvAoTq

- **Home:** topic toggle with Addition selected and the other five options disabled; Start button; settings link.
- **Session:** Speaking, Listening and wrong-answer states; time left and progress bar (no score during the session); End button.
- **Summary:** score, average time, accuracy.
- **Settings:** voice picker and "Play 47 plus 38" button.
- Built against a fake SessionState, so it needs no real controller.
- Not in M1: the export button.

## Done when

- [ ] Every screen state renders in Chrome from fake states.
- [ ] Each matches the canvas at 390 px wide.
