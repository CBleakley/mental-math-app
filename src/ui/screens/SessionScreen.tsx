import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SessionState } from '../../core/contracts';
import { formatClock, timeUsedFraction } from '../format';
import { CheckIcon, CrossIcon, SpeakerIcon } from '../icons';
import { ScreenFrame } from '../ScreenFrame';
import { colors, fonts } from '../theme';

export interface SessionScreenProps {
  /** Phase is 'speaking', 'listening' or 'feedback'. The score is never shown here. */
  state: SessionState;
  onEnd: () => void;
}

export function SessionScreen({ state, onEnd }: SessionScreenProps) {
  const usedPercent = Math.round(timeUsedFraction(state.timeLeftMs, state.durationMs) * 100);

  return (
    <ScreenFrame style={styles.frame}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable role="button" onPress={onEnd} style={styles.endButton}>
            <Text style={styles.endLabel}>End</Text>
          </Pressable>
          <View style={styles.timeLeft}>
            <Text style={styles.timeLeftLabel}>Time left</Text>
            <Text style={styles.timeLeftValue}>{formatClock(state.timeLeftMs)}</Text>
          </View>
        </View>
        <View
          accessible
          role="progressbar"
          aria-label="Session time used"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={usedPercent}
          style={styles.track}
        >
          <View style={[styles.fill, { width: `${usedPercent}%` }]} />
        </View>
      </View>

      <SessionBody state={state} />
    </ScreenFrame>
  );
}

function SessionBody({ state }: { state: SessionState }) {
  if (state.error) {
    return (
      <View style={styles.centre}>
        <Text role="alert" style={styles.error}>
          {state.error}
        </Text>
      </View>
    );
  }

  const feedback = state.feedback;
  if (state.phase === 'feedback' && feedback && feedback.outcome !== 'correct') {
    return <WrongAnswer outcome={feedback.outcome} question={feedback.question} answer={feedback.correctAnswer} />;
  }
  if (state.phase === 'feedback') {
    return (
      <StatusOrb halo={colors.accentHalo} fill={colors.accent} label="Correct" labelColor={colors.accent}>
        <CheckIcon color={colors.onAccent} />
      </StatusOrb>
    );
  }
  if (state.phase === 'listening') {
    return (
      <StatusOrb halo={colors.accentHalo} fill={colors.accent} label="Listening…" labelColor={colors.accent}>
        <View style={styles.bars}>
          {[18, 34, 24, 40, 20].map((height, i) => (
            <View key={i} style={[styles.bar, { height }]} />
          ))}
        </View>
      </StatusOrb>
    );
  }
  return (
    <StatusOrb halo={colors.speakingHalo} fill={colors.speaking} label="Speaking" labelColor={colors.speaking}>
      <SpeakerIcon size={38} color={colors.onSpeaking} loud />
    </StatusOrb>
  );
}

function StatusOrb(props: {
  halo: string;
  fill: string;
  label: string;
  labelColor: string;
  children: ReactNode;
}) {
  return (
    <View aria-live="polite" style={styles.centre}>
      <View style={[styles.halo, { backgroundColor: props.halo }]}>
        <View style={[styles.orb, { backgroundColor: props.fill }]}>{props.children}</View>
      </View>
      <Text style={[styles.statusLabel, { color: props.labelColor }]}>{props.label}</Text>
    </View>
  );
}

function WrongAnswer(props: { outcome: 'wrong' | 'missed'; question: string; answer: number }) {
  return (
    <>
      <View aria-live="assertive" style={styles.wrongBody}>
        <View style={styles.wrongHeading}>
          <View style={styles.wrongBadge}>
            <CrossIcon color={colors.wrong} />
          </View>
          <Text style={styles.wrongTitle}>{props.outcome === 'missed' ? 'Missed' : 'Not quite'}</Text>
        </View>
        <View style={styles.answerBlock}>
          <Text style={styles.question}>{props.question}</Text>
          <Text style={styles.answer}>{props.answer}</Text>
        </View>
      </View>
      <View style={styles.saying}>
        <SpeakerIcon size={18} color={colors.speaking} />
        <Text style={styles.sayingLabel}>Speaking…</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  frame: {
    paddingTop: 60,
    paddingBottom: 48,
  },
  header: {
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  endButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  endLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.text,
  },
  timeLeft: {
    alignItems: 'flex-end',
  },
  timeLeftLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 11 * 0.08,
  },
  timeLeftValue: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 22,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    backgroundColor: colors.text,
  },
  centre: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  halo: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bar: {
    width: 5,
    borderRadius: 3,
    backgroundColor: colors.onAccent,
  },
  statusLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 18,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 24,
    color: colors.wrong,
    textAlign: 'center',
  },
  wrongBody: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 28,
  },
  wrongHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wrongBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.wrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrongTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 18,
    color: colors.wrong,
  },
  answerBlock: {
    gap: 6,
  },
  question: {
    fontFamily: fonts.body,
    fontSize: 18,
    color: colors.muted,
  },
  answer: {
    fontFamily: fonts.displayBold,
    fontSize: 96,
    lineHeight: 96,
    letterSpacing: 96 * -0.03,
    color: colors.text,
  },
  saying: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  sayingLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.speaking,
  },
});
