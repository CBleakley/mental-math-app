import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Millis, SpeechInputEvent } from '../../core/contracts';
import { WebClock } from '../../adapters/web/web-clock';
import { type RecognitionDebugEntry, WebSpeechInput } from '../../adapters/web/web-speech-input';

/** Gap between turns, standing in for the app speaking the next question with the mic off. */
const GAP_MS = 600;

interface TurnRow {
  n: number;
  transcript: string;
  /** All times are ms after the turn started. */
  speechStart: Millis | null;
  firstInterim: Millis | null;
  final: Millis | null;
}

const clock = new WebClock();
/** Where raw recogniser activity goes while the screen is mounted. */
let debugSink: ((entry: RecognitionDebugEntry) => void) | null = null;
const input = new WebSpeechInput({ clock, onDebug: (entry) => debugSink?.(entry) });

/**
 * Dev page for M1-05 (open with `?dev=speech-input`). Listens turn after turn and shows each
 * transcript with its timings, so speech-start and first-interim can be compared on the iPhone.
 */
export function SpeechInputDevScreen() {
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<TurnRow[]>([]);
  const [status, setStatus] = useState('Idle');
  const [log, setLog] = useState<string[]>([]);
  const runningRef = useRef(false);
  const t0 = useRef(0);

  const addLog = (line: string) =>
    setLog((l) => [`${((clock.now() - t0.current) / 1000).toFixed(3)}  ${line}`, ...l].slice(0, 300));

  useEffect(() => {
    debugSink = (e) => addLog(`  rec ${e.kind}${e.detail ? ` ${e.detail}` : ''}`);
    return () => {
      debugSink = null;
      runningRef.current = false;
      input.stop();
    };
  }, []);

  const startTurn = (n: number) => {
    if (!runningRef.current) return;
    const startedAt = clock.now();
    const row: TurnRow = { n, transcript: '', speechStart: null, firstInterim: null, final: null };
    setStatus(`Listening (turn ${n})`);
    addLog(`turn ${n} start`);
    input.start((event: SpeechInputEvent) => {
      const rel = Math.round(event.at - startedAt);
      addLog(describe(event, rel));
      if (event.type === 'speech-start') row.speechStart = rel;
      if (event.type === 'interim' && row.firstInterim === null) row.firstInterim = rel;
      if (event.type === 'final') {
        row.final = rel;
        row.transcript = event.transcript;
        setRows((r) => [{ ...row }, ...r]);
        setStatus('Gap (mic off)');
        clock.schedule(GAP_MS, () => startTurn(n + 1));
      }
      if (event.type === 'error' && event.fatal) {
        setStatus(`Stopped: ${event.code}${event.message ? ` (${event.message})` : ''}`);
        runningRef.current = false;
        setRunning(false);
      }
    });
  };

  const start = () => {
    if (!input.isSupported) {
      setStatus('Speech recognition is not supported in this browser.');
      return;
    }
    t0.current = clock.now();
    setRows([]);
    setLog([]);
    runningRef.current = true;
    setRunning(true);
    startTurn(1);
  };

  const stop = () => {
    runningRef.current = false;
    setRunning(false);
    input.stop();
    setStatus('Stopped');
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Speech input (dev)</Text>
      <Text style={styles.hint}>
        Tap Start, then say a number each turn. Times are ms after listening began. Δ = first interim − speech-start.
      </Text>
      <View style={styles.buttons}>
        <Pressable style={[styles.button, running && styles.disabled]} onPress={start} disabled={running}>
          <Text style={styles.buttonText}>Start</Text>
        </Pressable>
        <Pressable style={[styles.button, !running && styles.disabled]} onPress={stop} disabled={!running}>
          <Text style={styles.buttonText}>Stop</Text>
        </Pressable>
      </View>
      <Text style={styles.status}>
        {status} · {rows.length} answers
      </Text>

      <View style={[styles.row, styles.header]}>
        <Text style={styles.n}>#</Text>
        <Text style={styles.transcript}>Transcript</Text>
        <Text style={styles.num}>Speech</Text>
        <Text style={styles.num}>Interim</Text>
        <Text style={styles.num}>Δ</Text>
        <Text style={styles.num}>Final</Text>
      </View>
      {rows.map((r) => (
        <View key={r.n} style={styles.row}>
          <Text style={styles.n}>{r.n}</Text>
          <Text style={styles.transcript}>{r.transcript}</Text>
          <Text style={styles.num}>{r.speechStart ?? '–'}</Text>
          <Text style={styles.num}>{r.firstInterim ?? '–'}</Text>
          <Text style={styles.num}>
            {r.speechStart !== null && r.firstInterim !== null ? r.firstInterim - r.speechStart : '–'}
          </Text>
          <Text style={styles.num}>{r.final ?? '–'}</Text>
        </View>
      ))}

      <Text style={styles.logTitle}>Event log (newest first, seconds since Start)</Text>
      <Text style={styles.log} selectable>
        {log.join('\n')}
      </Text>
    </ScrollView>
  );
}

function describe(event: SpeechInputEvent, rel: Millis): string {
  switch (event.type) {
    case 'speech-start':
      return `speech-start (+${rel})`;
    case 'interim':
      return `interim "${event.transcript}" (+${rel})`;
    case 'final':
      return `final "${event.transcript}" (+${rel})`;
    case 'error':
      return `error ${event.code}${event.fatal ? ' FATAL' : ''}${event.message ? `: ${event.message}` : ''}`;
  }
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 8, maxWidth: 600, width: '100%', alignSelf: 'center' },
  title: { fontSize: 22, fontWeight: '600' },
  hint: { color: '#555' },
  buttons: { flexDirection: 'row', gap: 12 },
  button: { backgroundColor: '#1f5eff', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  disabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  status: { fontWeight: '500' },
  row: { flexDirection: 'row', gap: 4, paddingVertical: 4, borderBottomWidth: 1, borderColor: '#eee' },
  header: { borderColor: '#999' },
  n: { width: 24 },
  transcript: { flex: 1 },
  num: { width: 52, textAlign: 'right', fontVariant: ['tabular-nums'] },
  logTitle: { marginTop: 16, fontWeight: '600' },
  log: { fontFamily: 'monospace', fontSize: 11, color: '#333' },
});
