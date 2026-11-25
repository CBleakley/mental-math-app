# M1-09 Session controller

- **Status:** done
- **Wave:** 3 (critical path; start first)
- **Depends on:** M1-02 (uses stub parser and generator until M1-07 and M1-08 land)
- **Unblocks:** M1-11

## Goal

The full hands-free loop, tested end to end with fakes.

## Scope

State machine: ask → listen → judge → feedback → next.

- Mic off while the app speaks; no interrupting.
- **Correct:** chime, next problem.
- **Wrong:** say the correct answer straight away, no retry (quick methods are out of scope for M1).
- **Unrecognised:** "sorry, again?" once; a second miss counts as wrong.
- **Silence:** repeat the problem after 10 seconds; after another 10 seconds, skip and count as missed.
- **Commands:** repeat, and skip (counts as missed). A command is not an attempt, its speech-start is not an answer time, and the 10- and 20-second silence timers restart after it. Log every command in the event log.
- **Session length:** fixed 5 minutes; the current problem is finished when time runs out.
- **Timing:** from the end of the spoken question to the start of the answer.
- **End summary:** one spoken sentence, e.g. "18 out of 22, averaging 3.1 seconds".
- **End button:** stops the session early and goes to the summary.
- Emits SessionState for the screens and entries for the event log.

## Done when

- [x] Jest runs whole scripted sessions with fake adapters and a fake clock, covering each rule above.
