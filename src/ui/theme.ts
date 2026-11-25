// Colours and type from the screen designs canvas.

export const colors = {
  background: '#0E1013',
  surface: '#1A1D22',
  border: '#2A2E35',
  text: '#F3F2EE',
  muted: '#A3A7AE',
  accent: '#4FD18B',
  onAccent: '#05190E',
  accentHalo: 'rgba(79, 209, 139, 0.12)',
  speaking: '#8AB8FF',
  onSpeaking: '#0B1526',
  speakingHalo: 'rgba(138, 184, 255, 0.12)',
  wrong: '#FF8C69',
} as const;

/**
 * Font family names as registered by `useAppFonts`. React Native picks a font file by
 * family name, not by fontWeight, so each weight is its own family.
 */
export const fonts = {
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  displayMedium: 'SpaceGrotesk_500Medium',
  displaySemiBold: 'SpaceGrotesk_600SemiBold',
  displayBold: 'SpaceGrotesk_700Bold',
} as const;

/** Screens are designed at 390 px wide; wider windows centre a column this wide. */
export const maxContentWidth = 430;
