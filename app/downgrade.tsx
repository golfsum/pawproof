import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PetAvatar } from '@/components/PetAvatar';
import { useAuth } from '@/hooks/AuthProvider';
import { useData } from '@/hooks/useData';
import { setPetActive } from '@/lib/firestore';
import { FREE_LIMITS } from '@/lib/premium';
import { colors, fonts, radius, spacing, typography } from '@/theme';

// Downgrade reconciliation. Shown when a non-premium user has more active pets
// than the free limit (e.g. they were Plus with 3 pets and let the
// subscription lapse). They pick which pets stay active; the rest are parked
// read-only (data preserved, never deleted). Upgrading restores everyone.
export default function DowngradeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { pets } = useData();

  const limit: number = FREE_LIMITS.pets;
  const activePets = useMemo(() => pets.filter(p => !p.inactive), [pets]);

  // Pre-select the most recently active pets up to the limit as a sensible
  // default (the user can change it).
  const [keep, setKeep] = useState<Set<string>>(
    () => new Set(activePets.slice(0, limit).map(p => p.id)),
  );
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    setKeep(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < limit) {
        next.add(id);
      } else {
        Alert.alert(`Keep ${limit}`, `You can keep ${limit} pets active on the free plan. Deselect one first, or upgrade for unlimited.`);
      }
      return next;
    });
  };

  const confirm = async () => {
    if (!user) return;
    if (keep.size !== limit) {
      Alert.alert('Pick your pets', `Choose ${limit} pet${limit === 1 ? '' : 's'} to keep active.`);
      return;
    }
    setSaving(true);
    try {
      // Park everyone not chosen; ensure the chosen ones are active.
      await Promise.all(
        activePets.map(p => setPetActive(user.uid, p.id, keep.has(p.id))),
      );
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.iconWrap}>
          <Ionicons name="paw-outline" size={32} color={colors.primary} />
        </View>
        <Text style={[typography.h1, { textAlign: 'center' }]}>Choose your pets</Text>
        <Text style={styles.intro}>
          Your PawProof Plus is no longer active, and the free plan covers {limit} pets.
          Pick {limit} to keep active — the rest stay saved and become view-only until you
          upgrade or remove a pet. Nothing is deleted.
        </Text>

        <Text style={styles.counter}>{keep.size} of {limit} selected</Text>

        <View style={styles.list}>
          {activePets.map(pet => {
            const selected = keep.has(pet.id);
            return (
              <Pressable
                key={pet.id}
                onPress={() => toggle(pet.id)}
                style={({ pressed }) => [
                  styles.row,
                  selected && styles.rowSelected,
                  pressed && { opacity: 0.92 },
                ]}
              >
                <PetAvatar pet={pet} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.petName}>{pet.name}</Text>
                  <Text style={styles.petSub}>
                    {pet.breed ? pet.breed : pet.species}
                  </Text>
                </View>
                <View style={[styles.check, selected && styles.checkOn]}>
                  {selected ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <PrimaryButton
          title={`Keep these ${limit} active`}
          onPress={confirm}
          loading={saving}
          disabled={keep.size !== limit}
          icon="checkmark-outline"
        />
        <PrimaryButton
          title="Upgrade to keep all"
          variant="secondary"
          icon="sparkles-outline"
          onPress={() => router.push('/paywall')}
          style={{ marginTop: spacing.sm }}
        />
        <Text style={styles.footnote}>
          Parked pets keep all their records, reminders, and documents. Re-subscribe
          anytime to reactivate them instantly.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing['3xl'], gap: spacing.sm },
  iconWrap: {
    alignSelf: 'center',
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  intro: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, paddingHorizontal: spacing.sm },
  counter: {
    fontSize: 12, fontFamily: fonts.body.semibold, letterSpacing: 0.5,
    textTransform: 'uppercase', color: colors.primary, textAlign: 'center', marginTop: spacing.sm,
  },
  list: { gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  rowSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  petName: { fontSize: 16, fontFamily: fonts.body.semibold, color: colors.text },
  petSub: { fontSize: 13, color: colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  check: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  footnote: { fontSize: 12, color: colors.textFaint, textAlign: 'center', lineHeight: 17, marginTop: spacing.md },
});
