import { Platform } from 'react-native';

import { SpeechOutputDevScreen } from './src/ui/dev/SpeechOutputDevScreen';
import { PlaceholderScreen } from './src/ui/PlaceholderScreen';

// Dev pages, opened on web with ?dev=<name>.
const devPage =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('dev')
    : null;

export default function App() {
  if (devPage === 'speech') return <SpeechOutputDevScreen />;
  return <PlaceholderScreen />;
}
