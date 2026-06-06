import React, { useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/hooks/AuthProvider';
import { colors, fonts, radius, spacing, typography } from '@/theme';

const { width: SCREEN_W } = Dimensions.get('window');

// First-run welcome carousel. Shows the value of the app BEFORE asking for
// signup, so new users aren't met with a cold login wall. Both "Get started"
// (signup) and a quiet "Sign in" are always available — no pressure.

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  logo?: boolean;
};

const SLIDES: Slide[] = [
  {
    icon: 'paw',
    logo: true,
    title: 'Welcome to PawProof',
    body: 'Every pet’s records, reminders, and health — organized in one calm place.',
  },
  {
    icon: 'scan-outline',
    title: 'Smart Scan does the typing',
    body: 'Snap a vaccine certificate or vet record and PawProof reads the dates, clinic, and renewals for you.',
  },
  {
    icon: 'alarm-outline',
    title: 'Never miss a thing',
    body: 'Gentle reminders for feeding, walks, medications, and vaccine renewals — before they lapse.',
  },
  {
    icon: 'heart-outline',
    title: 'Ready when it matters',
    body: 'Vet-ready health summaries and emergency cards for sitters, boarding, and new vets.',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { continueAsGuest } = useAuth();
  const [index, setIndex] = useState(0);
  const [guestBusy, setGuestBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const startGuest = async () => {
    if (guestBusy) return;
    setGuestBusy(true);
    try {
      // After anonymous sign-in the root nav routes into onboarding/tabs.
      await continueAsGuest();
    } catch (e: any) {
      setGuestBusy(false);
      Alert.alert('Could not continue', e?.message ?? 'Please try again.');
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (i !== index) setIndex(i);
  };

  const isLast = index === SLIDES.length - 1;

  const next = () => {
    if (isLast) {
      router.push('/(auth)/sign-up');
      return;
    }
    scrollRef.current?.scrollTo({ x: SCREEN_W * (index + 1), animated: true });
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.push('/(auth)/sign-up')} hitSlop={8}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width: SCREEN_W }]}>
            {s.logo ? (
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logo}
                resizeMode="contain"
                accessibilityLabel="PawProof logo"
              />
            ) : (
              <View style={styles.iconWrap}>
                <Ionicons name={s.icon} size={56} color={colors.primary} />
              </View>
            )}
            <Text style={[typography.display, styles.title]}>{s.title}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title={isLast ? 'Get started' : 'Next'}
          onPress={next}
          icon={isLast ? 'arrow-forward-outline' : undefined}
        />
        <Pressable onPress={() => router.push('/(auth)/sign-in')} hitSlop={8} style={styles.signInRow}>
          <Text style={styles.signInText}>
            Already have an account? <Text style={styles.signInLink}>Sign in</Text>
          </Text>
        </Pressable>
        <Pressable onPress={startGuest} hitSlop={8} disabled={guestBusy} style={styles.guestRow}>
          <Text style={styles.guestText}>
            {guestBusy ? 'Setting up…' : 'Just exploring? Try it without an account'}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    height: 36,
  },
  skip: { fontSize: 14, fontFamily: fonts.body.semibold, color: colors.textMuted },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  logo: { width: 110, height: 110, borderRadius: 26, marginBottom: spacing.sm },
  iconWrap: {
    width: 110,
    height: 110,
    borderRadius: 30,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { textAlign: 'center' },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.primary, width: 22 },
  footer: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  signInRow: { alignItems: 'center', paddingTop: spacing.sm },
  signInText: { fontSize: 14, color: colors.textMuted },
  signInLink: { color: colors.primary, fontFamily: fonts.body.semibold },
  guestRow: { alignItems: 'center', paddingVertical: spacing.xs },
  guestText: { fontSize: 13, color: colors.textFaint, fontFamily: fonts.body.semibold },
});
