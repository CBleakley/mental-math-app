import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GearIcon, MicIcon } from '../icons';
import { ScreenFrame } from '../ScreenFrame';
import { colors, fonts } from '../theme';

interface Topic {
  id: string;
  symbol: string;
  name: string;
  /** Only addition is available in M1; the rest arrive with their milestones. */
  enabled: boolean;
}

const topics: readonly Topic[] = [
  { id: 'addition', symbol: '+', name: 'Addition', enabled: true },
  { id: 'subtraction', symbol: '−', name: 'Subtraction', enabled: false },
  { id: 'multiplication', symbol: '×', name: 'Multiplication', enabled: false },
  { id: 'division', symbol: '÷', name: 'Division', enabled: false },
  { id: 'percentages', symbol: '%', name: 'Percentages', enabled: false },
  { id: 'mix', symbol: '', name: 'Mix', enabled: false },
];

export interface HomeScreenProps {
  onStart: () => void;
  onOpenSettings: () => void;
  /** A fatal error from the last attempt, e.g. microphone permission refused. */
  error?: string | null;
}

export function HomeScreen({ onStart, onOpenSettings, error }: HomeScreenProps) {
  return (
    <ScreenFrame style={styles.frame}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Mental maths</Text>
        <Pressable
          role="button"
          aria-label="Voice settings"
          onPress={onOpenSettings}
          style={styles.iconButton}
        >
          <GearIcon color={colors.text} />
        </Pressable>
      </View>

      <View role="radiogroup" aria-label="Topic" style={styles.topicGrid}>
        {topics.map((topic) => {
          // Addition is the only topic, so it is always the selected one in M1.
          const selected = topic.id === 'addition';
          return (
            <Pressable
              key={topic.id}
              role="radio"
              aria-checked={selected}
              aria-disabled={!topic.enabled}
              disabled={!topic.enabled}
              style={[
                styles.topic,
                selected ? styles.topicSelected : styles.topicUnselected,
                !topic.enabled && styles.topicDisabled,
              ]}
            >
              {topic.symbol ? (
                <Text
                  aria-hidden
                  style={[styles.topicSymbol, { color: selected ? colors.onAccent : colors.text }]}
                >
                  {topic.symbol}
                </Text>
              ) : null}
              <Text style={[styles.topicName, { color: selected ? colors.onAccent : colors.text }]}>
                {topic.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        {error ? (
          <Text role="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Pressable role="button" onPress={onStart} style={styles.start}>
          <MicIcon color={colors.onAccent} />
          <Text style={styles.startLabel}>Start</Text>
        </Pressable>
      </View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  frame: {
    paddingTop: 64,
    paddingBottom: 40,
    gap: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    letterSpacing: 13 * 0.08,
    textTransform: 'uppercase',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  topic: {
    // Two columns with a 10 px gap.
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topicSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  topicUnselected: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  topicDisabled: {
    opacity: 0.4,
  },
  topicSymbol: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 26,
    lineHeight: 26,
  },
  topicName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
  },
  footer: {
    marginTop: 'auto',
    gap: 10,
    alignItems: 'center',
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21,
    color: colors.wrong,
    textAlign: 'center',
  },
  start: {
    width: '100%',
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 18,
    color: colors.onAccent,
  },
});
