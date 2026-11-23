# M1-04 SpeechOutput web adapter

- **Status:** todo
- **Wave:** 3
- **Depends on:** M1-02 (M1-03 for the iPhone check)
- **Unblocks:** M1-11

## Goal

The app speaks in the chosen device voice.

## Scope

- Browser `speechSynthesis` behind the SpeechOutput interface.
- List en-GB voices first; mark enhanced/premium voices where the browser exposes it.
- Handle voices that load late (the list can be empty at first).
- `speak` resolves only when speech has finished; the controller relies on this to turn the mic on.

## Done when

- [ ] A dev page speaks "47 plus 38" in a picked voice in Chrome on Windows.
- [ ] The same works in Safari on the iPhone.
