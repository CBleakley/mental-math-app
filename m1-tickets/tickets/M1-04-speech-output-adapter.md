# M1-04 SpeechOutput web adapter

- **Status:** in progress
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

## Notes

- Adapter: `src/adapters/web/web-speech-output.ts`. Dev page: open the site with `?dev=speech` (locally `npx expo start --web`, then add `?dev=speech`; on the deployed site the same).
- Status stays `in progress` until both checks above are confirmed by hand.
- For M1-11: iOS Safari only speaks after a user gesture, so the first `speak` (or a silent one) must happen inside the Start tap.
