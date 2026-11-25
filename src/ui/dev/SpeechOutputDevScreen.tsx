import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { WebSpeechOutput } from '../../adapters/web/web-speech-output';
import type { Voice } from '../../core/contracts';

// Dev-only page (open the site with ?dev=speech) to check the SpeechOutput adapter on each browser.
export function SpeechOutputDevScreen() {
  const output = useMemo(() => new WebSpeechOutput(), []);
  const [voices, setVoices] = useState<Voice[] | null>(null);
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [text, setText] = useState('47 plus 38');
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    let live = true;
    output.listVoices().then((v) => live && setVoices(v));
    return () => {
      live = false;
      output.stop();
    };
  }, [output]);

  const pick = (id: string | null) => {
    setVoiceId(id);
    output.setVoice(id);
  };

  const speak = async () => {
    setStatus('speaking…');
    const start = performance.now();
    await output.speak(text);
    setStatus(`finished after ${Math.round(performance.now() - start)} ms`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>SpeechOutput dev page</Text>
      <TextInput style={styles.input} value={text} onChangeText={setText} />
      <View style={styles.row}>
        <Button label="Speak" onPress={speak} />
        <Button label="Stop" onPress={() => output.stop()} />
      </View>
      <Text>Status: {status}</Text>
      <Text style={styles.heading}>
        Voices {voices ? `(${voices.length})` : '(loading…)'}
      </Text>
      <VoiceRow label="Platform default (en-GB)" selected={voiceId === null} onPress={() => pick(null)} />
      {voices?.map((v) => (
        <VoiceRow
          key={v.id}
          label={`${v.name} · ${v.lang}${v.quality !== 'standard' ? ` · ${v.quality}` : ''}${v.isDefault ? ' · default' : ''}`}
          selected={voiceId === v.id}
          onPress={() => pick(v.id)}
        />
      ))}
    </ScrollView>
  );
}

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function VoiceRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.voice, selected && styles.voiceSelected]} onPress={onPress}>
      <Text>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8, maxWidth: 600 },
  title: { fontSize: 20, fontWeight: '600' },
  heading: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, fontSize: 16 },
  row: { flexDirection: 'row', gap: 8 },
  button: { backgroundColor: '#222', borderRadius: 6, paddingVertical: 10, paddingHorizontal: 16 },
  buttonText: { color: '#fff', fontWeight: '600' },
  voice: { padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#eee' },
  voiceSelected: { borderColor: '#222', backgroundColor: '#f2f2f2' },
});
