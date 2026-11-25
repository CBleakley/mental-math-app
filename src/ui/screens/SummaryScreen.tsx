import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SessionSummary } from '../../core/contracts';
import { formatPercent, formatSeconds } from '../format';
import { ScreenFrame } from '../ScreenFrame';
import { colors, fonts } from '../theme';

export interface SummaryScreenProps {
  summary: SessionSummary;
  /** Back to the home screen. */
  onDone: () => void;
}

export function SummaryScreen({ summary, onDone }: SummaryScreenProps) {
  return (
    <ScreenFrame style={styles.frame}>
      <Text style={styles.eyebrow}>Session complete · Addition</Text>

      <View aria-label="Score" style={styles.score}>
        <Text style={styles.correct}>{summary.correct}</Text>
        <Text style={styles.outOf}>out of {summary.attempted}</Text>
      </View>

      <View style={styles.stats}>
        <Stat label="Average time" value={formatSeconds(summary.averageResponseMs)} />
        <Stat label="Accuracy" value={formatPercent(summary.accuracy)} />
      </View>

      <View style={styles.footer}>
        <Pressable role="button" onPress={onDone} style={styles.done}>
          <Text style={styles.doneLabel}>Done</Text>
        </Pressable>
      </View>
    </ScreenFrame>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    paddingTop: 72,
    paddingBottom: 40,
    gap: 28,
  },
  eyebrow: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    letterSpacing: 13 * 0.08,
    textTransform: 'uppercase',
  },
  score: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  correct: {
    fontFamily: fonts.displayBold,
    fontSize: 112,
    lineHeight: 112 * 0.9,
    letterSpacing: 112 * -0.04,
    color: colors.text,
  },
  outOf: {
    fontFamily: fonts.displayMedium,
    fontSize: 32,
    color: colors.muted,
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    gap: 4,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  statValue: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 26,
    color: colors.text,
  },
  footer: {
    marginTop: 'auto',
  },
  done: {
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 18,
    color: colors.onAccent,
  },
});
