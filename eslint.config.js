// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Core is pure TypeScript: it must not depend on React, Expo, React Native or
// browser APIs. Platform code lives in src/adapters and src/ui.
const coreBannedImports = [
  {
    group: ['react', 'react/*', 'react-dom', 'react-dom/*'],
    message: 'src/core must not import React. Put UI code in src/ui.',
  },
  {
    group: ['react-native', 'react-native/*', 'react-native-*', '@react-native/*', '@react-native-*/*'],
    message: 'src/core must not import React Native. Put platform code in src/adapters.',
  },
  {
    group: ['expo', 'expo/*', 'expo-*', '@expo/*'],
    message: 'src/core must not import Expo. Put platform code in src/adapters.',
  },
  {
    group: ['**/adapters/**', '**/ui/**'],
    message: 'src/core must not import adapters or UI. Depend on an interface instead.',
  },
];

const browserGlobals = [
  'window',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'speechSynthesis',
  'SpeechSynthesisUtterance',
  'SpeechRecognition',
  'webkitSpeechRecognition',
  'AudioContext',
  'webkitAudioContext',
  'Audio',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'location',
  'history',
].map((name) => ({
  name,
  message: 'src/core must not use browser APIs. Put them behind an interface in src/adapters/web.',
}));

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'web-build/*', '.expo/*'],
  },
  {
    files: ['src/core/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: coreBannedImports }],
      'no-restricted-globals': ['error', ...browserGlobals],
    },
  },
]);
