import { StatusBar } from 'expo-status-bar';

import { useAppFonts } from './src/ui/fonts';
import { PreviewApp } from './src/ui/preview/PreviewApp';

export default function App() {
  const fontsReady = useAppFonts();
  if (!fontsReady) return null;
  return (
    <>
      <PreviewApp />
      <StatusBar style="light" />
    </>
  );
}
