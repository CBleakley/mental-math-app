// Stand-in for the real composition root until M1-11 wires in the controller.
// Open with ?state=<name> (a key of fakeStates) to pin one screen state, e.g. ?state=wrong,
// or ?state=settings for the settings screen.
// Otherwise Start plays a short scripted loop through the session states.
import { useEffect, useRef, useState } from 'react';

import type { SessionState } from '../../core/contracts';
import { Screens } from '../Screens';
import { fakeStates, fakeVoices, type FakeStateName } from './fake-states';

/** Session states the demo cycles through, with how long each shows (ms). */
const demoLoop: readonly [FakeStateName, number][] = [
  ['speaking', 1500],
  ['listening', 2000],
  ['correct', 800],
  ['speaking', 1500],
  ['listening', 2000],
  ['wrong', 2500],
  ['speaking', 1500],
  ['listening', 2000],
  ['missed', 2500],
];

/** The demo runs the 5-minute clock this many times faster than real time. */
const DEMO_SPEED = 10;

function stateParam(): string | null {
  if (typeof window === 'undefined' || !window.location) return null;
  return new URLSearchParams(window.location.search).get('state');
}

function pinnedStateFromUrl(): SessionState | null {
  const name = stateParam();
  if (name && name in fakeStates) return fakeStates[name as FakeStateName];
  return null;
}

export function PreviewApp() {
  const [pinned] = useState(pinnedStateFromUrl);
  const [state, setState] = useState<SessionState>(pinned ?? fakeStates.idle);
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopDemo = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stopDemo, []);

  const startDemo = () => {
    const startedAt = Date.now();
    const duration = fakeStates.idle.durationMs;
    const step = (i: number) => {
      const timeLeftMs = Math.max(0, duration - (Date.now() - startedAt) * DEMO_SPEED);
      if (timeLeftMs === 0) {
        setState(fakeStates.summary);
        return;
      }
      const [name, showForMs] = demoLoop[i % demoLoop.length];
      setState({ ...fakeStates[name], timeLeftMs });
      timer.current = setTimeout(() => step(i + 1), showForMs);
    };
    step(0);
  };

  return (
    <Screens
      state={state}
      voices={fakeVoices}
      selectedVoiceId={voiceId}
      onStart={startDemo}
      onEnd={() => {
        stopDemo();
        setState(fakeStates.summary);
      }}
      onDone={() => setState(fakeStates.idle)}
      onSelectVoice={setVoiceId}
      onPlaySample={() => {}}
      initialScreen={stateParam() === 'settings' ? 'settings' : 'home'}
    />
  );
}
