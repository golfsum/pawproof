import type { Species, JournalEntryType, ReminderType } from '@/types/models';
import { colors } from '@/theme';

export const SPECIES_LABEL: Record<Species, string> = {
  dog: 'Dog',
  cat: 'Cat',
  bird: 'Bird',
  rabbit: 'Rabbit',
  reptile: 'Reptile',
  fish: 'Fish',
  small_mammal: 'Small mammal',
  other: 'Pet',
};

export const SPECIES_EMOJI: Record<Species, string> = {
  dog: '🐶',
  cat: '🐱',
  bird: '🐦',
  rabbit: '🐰',
  reptile: '🦎',
  fish: '🐠',
  small_mammal: '🐹',
  other: '🐾',
};

export const JOURNAL_META: Record<
  JournalEntryType,
  { label: string; icon: string; tint: string }
> = {
  fed: { label: 'Fed', icon: 'restaurant-outline', tint: colors.warning },
  walk: { label: 'Walk', icon: 'walk-outline', tint: colors.primary },
  medication: { label: 'Medication', icon: 'medkit-outline', tint: colors.danger },
  training: { label: 'Training', icon: 'school-outline', tint: colors.accent },
  grooming: { label: 'Grooming', icon: 'cut-outline', tint: colors.info },
  vet_visit: { label: 'Vet visit', icon: 'pulse-outline', tint: colors.danger },
  symptom: { label: 'Symptom', icon: 'alert-circle-outline', tint: colors.warning },
  bathroom: { label: 'Bathroom', icon: 'water-outline', tint: colors.info },
  accident: { label: 'Accident', icon: 'warning-outline', tint: colors.warning },
  note: { label: 'Note', icon: 'reader-outline', tint: colors.textMuted },
  photo: { label: 'Photo', icon: 'image-outline', tint: colors.primary },
};

export const REMINDER_META: Record<
  ReminderType,
  { label: string; icon: string; tint: string }
> = {
  feeding: { label: 'Feeding', icon: 'restaurant-outline', tint: colors.warning },
  walking: { label: 'Walk', icon: 'walk-outline', tint: colors.primary },
  medication: { label: 'Medication', icon: 'medkit-outline', tint: colors.danger },
  vet_visit: { label: 'Vet visit', icon: 'pulse-outline', tint: colors.danger },
  vaccination: { label: 'Vaccination', icon: 'shield-checkmark-outline', tint: colors.success },
  grooming: { label: 'Grooming', icon: 'cut-outline', tint: colors.info },
  flea_tick: { label: 'Flea / Tick', icon: 'bug-outline', tint: colors.warning },
  heartworm: { label: 'Heartworm', icon: 'heart-outline', tint: colors.danger },
  nail_trim: { label: 'Nail trim', icon: 'hand-left-outline', tint: colors.accent },
  custom: { label: 'Reminder', icon: 'bookmark-outline', tint: colors.textMuted },
};
