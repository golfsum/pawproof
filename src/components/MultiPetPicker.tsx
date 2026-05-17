import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PetAvatar } from './PetAvatar';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Pet } from '@/types/models';

// Multi-select pet picker. A leading "All pets" pill toggles the
// whole set on/off; individual pet pills toggle one at a time.
// Used by reminder/add to support "Dinner for the whole household"
// without the user having to create three identical reminders.
//
// Selection model: a Set<string> of petIds. An empty set is invalid
// (the caller's submit logic should require at least one). "All pets"
// is purely a UX shortcut — under the hood we always store the full
// list of IDs, never a sentinel value, so the data stays explicit and
// easy to migrate later.

interface Props {
  pets: Pet[];
  selectedIds: Set<string>;
  onChange: (selected: Set<string>) => void;
  label?: string;
}

export function MultiPetPicker({ pets, selectedIds, onChange, label = 'Pets' }: Props) {
  const allSelected = pets.length > 0 && selectedIds.size === pets.length;

  const toggleAll = () => {
    if (allSelected) {
      onChange(new Set());
    } else {
      onChange(new Set(pets.map(p => p.id)));
    }
  };

  const toggleOne = (petId: string) => {
    const next = new Set(selectedIds);
    if (next.has(petId)) {
      next.delete(petId);
    } else {
      next.add(petId);
    }
    onChange(next);
  };

  return (
    <View style={{ gap: 6 }}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.count}>
          {selectedIds.size === 0
            ? 'Pick at least one pet'
            : selectedIds.size === pets.length
              ? `All ${pets.length} pets selected`
              : selectedIds.size === 1
                ? '1 pet selected'
                : `${selectedIds.size} pets selected`}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {pets.length > 1 ? (
          <Pressable
            onPress={toggleAll}
            style={({ pressed }) => [
              styles.chip,
              styles.chipAll,
              allSelected && styles.chipAllSelected,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons
              name={allSelected ? 'checkmark-circle' : 'people-outline'}
              size={16}
              color={allSelected ? '#fff' : colors.primary}
            />
            <Text style={[styles.name, allSelected && styles.nameSelected]}>
              All pets
            </Text>
          </Pressable>
        ) : null}

        {pets.map(p => {
          const selected = selectedIds.has(p.id);
          return (
            <Pressable
              key={p.id}
              onPress={() => toggleOne(p.id)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && { opacity: 0.85 },
              ]}
            >
              <PetAvatar pet={p} size={22} />
              <Text style={[styles.name, selected && styles.nameSelected]} numberOfLines={1}>
                {p.name}
              </Text>
              {selected ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  label: { fontSize: 13, fontFamily: fonts.body.semibold, color: colors.textMuted },
  count: { fontSize: 12, color: colors.textFaint },
  row: { gap: spacing.sm, paddingHorizontal: 4, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipAll: { backgroundColor: colors.primarySoft, borderColor: colors.primary + '55' },
  chipAllSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  name: { fontSize: 14, fontFamily: fonts.body.semibold, color: colors.text, maxWidth: 120 },
  nameSelected: { color: '#fff' },
});
