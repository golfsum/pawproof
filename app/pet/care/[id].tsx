import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { PetAvatar } from '@/components/PetAvatar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/hooks/AuthProvider';
import { usePet } from '@/hooks/useData';
import { updatePet } from '@/lib/firestore';
import { colors, fonts, radius, spacing, typography } from '@/theme';

// Care Instructions per pet. Everything in here is optional and feeds
// into the Pet Sitter PDF + emergency-card share text, so a user
// who's set them up can hand a sitter a complete brief in one tap.
// Fields are deliberately free-form rather than structured (e.g.
// "feeding instructions" instead of "food brand + amount + time")
// because real-world feeding rules are too varied to model.

interface FieldSpec {
  key:
    | 'feedingInstructions'
    | 'walkRoutine'
    | 'behaviorNotes'
    | 'boardingInstructions'
    | 'favoriteThings'
    | 'allergies';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
}

const FIELDS: FieldSpec[] = [
  {
    key: 'feedingInstructions',
    label: 'Feeding',
    icon: 'restaurant-outline',
    placeholder: '1 cup Hill\'s Science Diet at 7 AM and 6 PM. No table scraps.',
  },
  {
    key: 'walkRoutine',
    label: 'Walks & exercise',
    icon: 'walk-outline',
    placeholder: 'Two 20-minute walks (morning + evening). Loves the park. Avoid pulling.',
  },
  {
    key: 'allergies',
    label: 'Allergies',
    icon: 'alert-circle-outline',
    placeholder: 'Chicken, grass pollen, bee stings.',
  },
  {
    key: 'behaviorNotes',
    label: 'Behavior notes',
    icon: 'happy-outline',
    placeholder: 'Does not like other dogs. Shy around men. Hides under the bed during thunder.',
  },
  {
    key: 'favoriteThings',
    label: 'Favorites',
    icon: 'heart-outline',
    placeholder: 'Squeaky duck toy, peanut butter in Kong, belly rubs after dinner.',
  },
  {
    key: 'boardingInstructions',
    label: 'Boarding & sitting',
    icon: 'bed-outline',
    placeholder: 'Sleeps in a crate at night. Door must stay closed when guests arrive.',
  },
];

export default function CareInstructionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const pet = usePet(String(params.id ?? ''));
  const { user } = useAuth();

  // One state-string per field. Initialized from the pet doc on mount
  // and on pet changes (e.g. if the live listener delivers an update
  // while the user is editing).
  const [values, setValues] = useState<Record<FieldSpec['key'], string>>({
    feedingInstructions: '',
    walkRoutine: '',
    behaviorNotes: '',
    boardingInstructions: '',
    favoriteThings: '',
    allergies: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!pet) return;
    setValues({
      feedingInstructions: pet.feedingInstructions ?? '',
      walkRoutine: pet.walkRoutine ?? '',
      behaviorNotes: pet.behaviorNotes ?? '',
      boardingInstructions: pet.boardingInstructions ?? '',
      favoriteThings: pet.favoriteThings ?? '',
      allergies: pet.allergies ?? '',
    });
  }, [pet?.id]);

  const handleSave = async () => {
    if (!user || !pet) return;
    setSaving(true);
    try {
      await updatePet(user.uid, pet.id, {
        feedingInstructions: values.feedingInstructions.trim() || undefined,
        walkRoutine: values.walkRoutine.trim() || undefined,
        behaviorNotes: values.behaviorNotes.trim() || undefined,
        boardingInstructions: values.boardingInstructions.trim() || undefined,
        favoriteThings: values.favoriteThings.trim() || undefined,
        allergies: values.allergies.trim() || undefined,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!pet) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Care instructions' }} />
        <View style={{ padding: spacing.lg, alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted }}>Pet not found.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Care instructions' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.intro}>
            <PetAvatar pet={pet} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={typography.h2}>{pet.name}'s care notes</Text>
              <Text style={styles.introBody}>
                Anything important a sitter, partner, or vet should know.
                Everything here also appears in the Pet Sitter PDF.
              </Text>
            </View>
          </View>

          {FIELDS.map(f => (
            <View key={f.key} style={styles.field}>
              <View style={styles.fieldHeader}>
                <View style={styles.fieldIcon}>
                  <Ionicons name={f.icon} size={16} color={colors.primary} />
                </View>
                <Text style={styles.fieldLabel}>{f.label}</Text>
              </View>
              <TextInput
                value={values[f.key]}
                onChangeText={t => setValues(prev => ({ ...prev, [f.key]: t }))}
                placeholder={f.placeholder}
                placeholderTextColor={colors.textFaint}
                multiline
                style={styles.input}
              />
            </View>
          ))}

          <View style={styles.disclaimerBox}>
            <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
            <Text style={styles.disclaimerText}>
              Care notes are stored only on your account. They appear in the
              Pet Sitter PDF and the in-app emergency card when shared.
            </Text>
          </View>

          <PrimaryButton
            title="Save"
            onPress={handleSave}
            loading={saving}
            icon="checkmark-outline"
          />
          <Pressable onPress={() => router.back()} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['2xl'], gap: spacing.md },
  intro: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  introBody: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },

  field: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.sm,
  },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fieldIcon: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  fieldLabel: { fontSize: 14, fontFamily: fonts.body.semibold, color: colors.text },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 80,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: 'top',
    lineHeight: 20,
  },

  disclaimerBox: {
    flexDirection: 'row',
    gap: 8,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disclaimerText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 17 },

  cancelBtn: { alignItems: 'center', padding: spacing.md },
  cancelText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
});
