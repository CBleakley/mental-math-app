# M1-05 SpeechInput web adapter

- **Status:** done
- **Wave:** 3 (riskiest ticket)
- **Depends on:** M1-02 (M1-03 for the iPhone check)
- **Unblocks:** M1-11

## Goal

Reliable answers and a usable speech-start time.

## Scope

- Browser `SpeechRecognition` with locale en-GB, behind the SpeechInput interface.
- Emit a speech-start timestamp as early as possible. Log both the speech-start event and the first interim result, so M1-12 can compare them.
- End an answer after about 1 second of silence.
- Restart cleanly between problems.
- Surface permission and "no speech" errors.

## Done when

- [ ] A dev page shows transcripts and timestamps for 20 spoken numbers in Safari on the iPhone.
- [ ] No hangs between turns.

## Note

Can start as a throwaway spike straight after M1-01 to de-risk early, then be moved onto the contracts.
