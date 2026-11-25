import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Voice, VoiceQuality } from '../../core/contracts';
import { BackIcon, SpeakerIcon } from '../icons';
import { colors, fonts, maxContentWidth } from '../theme';

/** The sample the Play button speaks. */
export const SAMPLE_PHRASE = '47 plus 38';

export interface SettingsScreenProps {
  voices: readonly Voice[];
  /** The chosen voice; null means the platform default. */
  selectedVoiceId: string | null;
  onSelectVoice: (voiceId: string) => void;
  /** Speaks SAMPLE_PHRASE in the chosen voice. */
  onPlaySample: () => void;
  onBack: () => void;
}

const qualityLabel: Record<VoiceQuality, string> = {
  premium: 'Premium',
  enhanced: 'Enhanced',
  standard: 'Standard',
};

export function SettingsScreen(props: SettingsScreenProps) {
  const checkedId = props.selectedVoiceId ?? props.voices.find((v) => v.isDefault)?.id ?? null;

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable role="button" aria-label="Back to home" onPress={props.onBack} style={styles.iconButton}>
            <BackIcon color={colors.text} />
          </Pressable>
          <Text role="heading" style={styles.title}>
            Settings
          </Text>
        </View>

        <View style={styles.section}>
          <Text role="heading" style={styles.sectionHeading}>
            Voice
          </Text>
          {props.voices.length === 0 ? (
            <View style={styles.list}>
              <Text style={styles.empty}>No voices found on this device.</Text>
            </View>
          ) : (
            <View role="radiogroup" aria-label="Spoken voice" style={styles.list}>
              {props.voices.map((voice, i) => (
                <Pressable
                  key={voice.id}
                  role="radio"
                  aria-checked={voice.id === checkedId}
                  aria-label={voice.name}
                  onPress={() => props.onSelectVoice(voice.id)}
                  style={[styles.row, i < props.voices.length - 1 && styles.rowDivider]}
                >
                  <View style={[styles.radio, voice.id === checkedId && styles.radioChecked]}>
                    {voice.id === checkedId ? <View style={styles.radioDot} /> : null}
                  </View>
                  <Text style={styles.voiceName} numberOfLines={1}>
                    {voice.name}
                  </Text>
                  <Text
                    style={[
                      styles.quality,
                      { color: voice.quality === 'standard' ? colors.muted : colors.speaking },
                    ]}
                  >
                    {qualityLabel[voice.quality]}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <Pressable role="button" onPress={props.onPlaySample} style={styles.play}>
            <SpeakerIcon size={16} color={colors.text} />
            <Text style={styles.playLabel}>Play “{SAMPLE_PHRASE}”</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  title: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 26,
    letterSpacing: 26 * -0.02,
    color: colors.text,
  },
  section: {
    gap: 10,
  },
  sectionHeading: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.muted,
    letterSpacing: 13 * 0.08,
    textTransform: 'uppercase',
  },
  list: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.muted,
    padding: 16,
  },
  row: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioChecked: {
    borderColor: colors.accent,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  voiceName: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  quality: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
  play: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  playLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.text,
  },
});
