import { Platform } from 'react-native';

import { SpeechInputDevScreen } from './src/ui/dev/SpeechInputDevScreen';
import { PlaceholderScreen } from './src/ui/PlaceholderScreen';

/** Dev pages, opened on web with `?dev=<name>`. */
const devPage = Platform.OS === 'web' ? new URLSearchParams(window.location.search).get('dev') : null;

export default function App() {
  if (devPage === 'speech-input') return <SpeechInputDevScreen />;
  return <PlaceholderScreen />;
}
