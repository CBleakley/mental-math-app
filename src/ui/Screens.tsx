import { useState } from 'react';

import type { SessionState, Voice } from '../core/contracts';
import { HomeScreen } from './screens/HomeScreen';
import { SessionScreen } from './screens/SessionScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SummaryScreen } from './screens/SummaryScreen';

export interface ScreensProps {
  /** The only input that decides which screen shows. */
  state: SessionState;
  voices: readonly Voice[];
  selectedVoiceId: string | null;
  onStart: () => void;
  /** End button during a session. */
  onEnd: () => void;
  /** Done on the summary: back to home. */
  onDone: () => void;
  onSelectVoice: (voiceId: string) => void;
  onPlaySample: () => void;
  /** Which screen shows before a session; for previews. Defaults to home. */
  initialScreen?: 'home' | 'settings';
}

/**
 * Picks the screen for the session phase. Settings is the only navigation the UI owns,
 * and is reachable only from home before a session.
 */
export function Screens(props: ScreensProps) {
  const [showSettings, setShowSettings] = useState(props.initialScreen === 'settings');
  const { state } = props;

  switch (state.phase) {
    case 'speaking':
    case 'listening':
    case 'feedback':
      return <SessionScreen state={state} onEnd={props.onEnd} />;
    case 'summary':
      if (state.summary) return <SummaryScreen summary={state.summary} onDone={props.onDone} />;
      break;
    case 'idle':
      break;
  }

  if (showSettings) {
    return (
      <SettingsScreen
        voices={props.voices}
        selectedVoiceId={props.selectedVoiceId}
        onSelectVoice={props.onSelectVoice}
        onPlaySample={props.onPlaySample}
        onBack={() => setShowSettings(false)}
      />
    );
  }
  return (
    <HomeScreen onStart={props.onStart} onOpenSettings={() => setShowSettings(true)} error={state.error} />
  );
}
