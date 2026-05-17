import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { PetCard } from '@/components/PetCard';
import { EmptyState } from '@/components/EmptyState';
import { FAB } from '@/components/FAB';
import { TabsHeader } from '@/components/TabsHeader';
import { useData } from '@/hooks/useData';
import { useGate } from '@/hooks/useGate';
import { colors, radius, spacing, typography } from '@/theme';
import { daysUntil } from '@/utils/dates';

export default function PetsScreen() {
  const router = useRouter();
  const { pets, reminders, vaccines, entries } = useData();
  const { check } = useGate();

  const handleAdd = () => {
    if (check('add_pet')) router.push('/pet/add');
  };

  return (
    <Screen>
      <TabsHeader />
      <View style={styles.header}>
        <Text style={typography.h1}>My Pets</Text>
        <Text style={styles.sub}>{pets.length} {pets.length === 1 ? 'pet' : 'pets'} on file</Text>
      </View>

      {pets.length === 0 ? (
        <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.lg }}>
          <EmptyState
            icon="paw-outline"
            title="No pets yet"
            body="Add your first pet to start tracking care, reminders, and records."
            cta={{ label: 'Add a pet', icon: 'add', onPress: handleAdd }}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.base, paddingBottom: 140, gap: spacing.sm }}
        >
          {pets.map(pet => (
            <PetCard
              key={pet.id}
              pet={pet}
              reminders={reminders}
              vaccines={vaccines}
              entries={entries}
            />
          ))}

          {/* "Add another pet" affordance: keeps the screen feeling lived-in
              with one pet, hints at premium / household sharing. */}
          <Pressable
            onPress={handleAdd}
            style={({ pressed }) => [styles.addAnother, pressed && { opacity: 0.9 }]}
          >
            <View style={styles.addIcon}>
              <Ionicons name="add" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addTitle}>Add another pet</Text>
              <Text style={styles.addSub}>Track records, reminders, and care for every pet in your household.</Text>
            </View>
          </Pressable>
        </ScrollView>
      )}

      <FAB onPress={handleAdd} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  addAnother: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    marginTop: spacing.sm,
  },
  addIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  addTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  addSub: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 17 },
});
