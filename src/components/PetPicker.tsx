import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { PetAvatar } from './PetAvatar';
import type { Pet } from '@/types/models';

interface Props {
  pets: Pet[];
  selectedId: string | null;
  onSelect: (petId: string) => void;
  label?: string;
}

export function PetPicker({ pets, selectedId, onSelect, label = 'Pet' }: Props) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {pets.map(p => {
          const selected = p.id === selectedId;
          return (
            <Pressable
              key={p.id}
              onPress={() => onSelect(p.id)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && { opacity: 0.85 },
              ]}
            >
              <PetAvatar pet={p} size={24} />
              <Text style={[styles.name, selected && styles.nameSelected]} numberOfLines={1}>{p.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginLeft: 4 },
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
  name: { fontSize: 14, fontWeight: '600', color: colors.text, maxWidth: 120 },
  nameSelected: { color: '#fff' },
});
