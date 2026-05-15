import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, radius } from '@/theme';
import { SPECIES_EMOJI } from '@/utils/petIcon';
import type { Pet } from '@/types/models';

interface Props {
  pet: Pick<Pet, 'photoUrl' | 'species' | 'name'>;
  size?: number;
}

export function PetAvatar({ pet, size = 48 }: Props) {
  const dim = { width: size, height: size, borderRadius: size * 0.32 };
  if (pet.photoUrl) {
    return (
      <Image
        source={{ uri: pet.photoUrl }}
        style={[styles.image, dim]}
        contentFit="cover"
        transition={120}
      />
    );
  }
  return (
    <View style={[styles.placeholder, dim]}>
      <Text style={{ fontSize: size * 0.5 }}>{SPECIES_EMOJI[pet.species] ?? '🐾'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.cardSubtle },
  placeholder: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
