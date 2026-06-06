import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Screen } from '@/components/Screen';
import { PetAvatar } from '@/components/PetAvatar';
import { useAuth } from '@/hooks/AuthProvider';
import { useData, useEntriesForPet, useVaccinesForPet } from '@/hooks/useData';
import { useGate } from '@/hooks/useGate';
import { deleteAllUserData, fetchAllUserData } from '@/lib/firestore';
import { sharePetHealthPdf } from '@/lib/pdf';
import { colors, fonts, radius, spacing, typography } from '@/theme';
import type { Pet } from '@/types/models';

// Data export hub. Two paths:
//   1. JSON backup. Free, always available. Pulls every record and
//      hands the user a .json file via the system share sheet. Acts as
//      the "your data is never trapped" safety net.
//   2. Records book PDF. Plus-gated. Bundles per-pet health summaries.
//      For now this routes to the paywall when free; once wired we'll
//      generate the PDF via expo-print here.

export default function DataExportScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { pets } = useData();
  const { check, isPremium } = useGate();
  const [jsonBusy, setJsonBusy] = useState(false);
  const [petPickerOpen, setPetPickerOpen] = useState(false);
  const [pdfPetId, setPdfPetId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const exportJson = async () => {
    if (!user) return;
    setJsonBusy(true);
    try {
      const backup = await fetchAllUserData(user.uid);
      const json = JSON.stringify(backup, null, 2);
      const stamp = new Date().toISOString().slice(0, 10);
      const fileUri = `${FileSystem.cacheDirectory}pawproof-backup-${stamp}.json`;
      await FileSystem.writeAsStringAsync(fileUri, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'PawProof backup',
          UTI: 'public.json',
        });
      } else {
        Alert.alert('Saved', `Backup saved to: ${fileUri}`);
      }
    } catch (e: any) {
      Alert.alert('Could not export', e?.message ?? 'Try again.');
    } finally {
      setJsonBusy(false);
    }
  };

  const exportPdf = () => {
    if (!check('pdf_export')) return;
    if (pets.length === 0) {
      Alert.alert(
        'Add a pet first',
        'You need at least one pet to generate a records book.',
      );
      return;
    }
    // Each pet exports as its own file. We let the user pick the pet
    // from a sheet here rather than bouncing them to the Pets tab.
    setPetPickerOpen(true);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Your data' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={typography.h1}>Your data, your control</Text>
          <Text style={styles.intro}>
            Everything you add to PawProof belongs to you. Export a copy
            anytime, or delete it for good. No tricks, no hostage data.
          </Text>
        </View>

        <ExportCard
          icon="archive-outline"
          title="Full backup (JSON)"
          body="A single file with every pet, vaccine, document link, reminder, and journal entry on this account. Save it to Files, iCloud, or email it to yourself."
          ctaLabel={jsonBusy ? 'Exporting…' : 'Export backup'}
          onPress={exportJson}
          disabled={jsonBusy}
          tone="primary"
        />

        <ExportCard
          icon="document-text-outline"
          title="Pet records book (PDF)"
          body="A polished, vet-ready PDF for each pet. Vaccines, weight, allergies, emergency contacts, recent activity, microchip number. Great for boarding, sitters, and new vets."
          ctaLabel={isPremium ? 'Pick a pet' : 'Upgrade to export'}
          ctaBadge={isPremium ? undefined : 'Plus'}
          onPress={exportPdf}
          tone="accent"
        />

        <View style={styles.trustBox}>
          <View style={styles.trustIcon}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.trustTitle}>Where your data lives</Text>
            <Text style={styles.trustBody}>
              Records sync privately to your PawProof account on Google
              Cloud. Delete your account and everything is wiped within
              30 days. Email{' '}
              <Text style={{ fontFamily: fonts.body.semibold, color: colors.primary }}>
                support@pawproof.app
              </Text>{' '}
              with any data questions.
            </Text>
          </View>
        </View>

        {/* Danger zone — wipe everything. Two layers of friction:
            the user has to expand the section, then type DELETE before
            the destructive button enables. Keeps tap-and-drag accidents
            from nuking somebody's records. */}
        <View style={styles.dangerCard}>
          <View style={styles.dangerHeader}>
            <View style={styles.dangerIcon}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dangerTitle}>Delete all my data</Text>
              <Text style={styles.dangerBody}>
                Removes every pet, record, document, reminder, and journal
                entry from this account. Cannot be undone.
              </Text>
            </View>
          </View>

          {deleteOpen ? (
            <View style={styles.dangerBox}>
              <Text style={styles.dangerWarning}>
                This will permanently delete:
              </Text>
              <Text style={styles.dangerBullets}>
                • All pets and their photos{'\n'}
                • Every vaccine record and uploaded document{'\n'}
                • Every reminder, including future ones{'\n'}
                • Every journal entry (meals, walks, meds, health){'\n'}
                • Every share invite you've sent
              </Text>
              <Text style={styles.dangerWarning}>
                Type{' '}
                <Text style={{ fontFamily: fonts.display.bold }}>DELETE</Text>{' '}
                below to confirm.
              </Text>
              <TextInput
                value={confirmText}
                onChangeText={setConfirmText}
                placeholder="DELETE"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="characters"
                autoCorrect={false}
                style={styles.dangerInput}
              />
              <View style={styles.dangerActions}>
                <Pressable
                  onPress={() => {
                    setDeleteOpen(false);
                    setConfirmText('');
                  }}
                  style={({ pressed }) => [styles.dangerCancel, pressed && { opacity: 0.85 }]}
                  disabled={deleting}
                >
                  <Text style={styles.dangerCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    if (!user) return;
                    if (confirmText.trim().toUpperCase() !== 'DELETE') return;
                    setDeleting(true);
                    try {
                      await deleteAllUserData(user.uid);
                      Alert.alert(
                        'Data deleted',
                        'Your records are gone. You\'ll be signed out now. To remove the account itself too, use Settings → Delete account.',
                        [
                          {
                            text: 'OK',
                            onPress: async () => {
                              await signOut();
                              router.replace('/(auth)/sign-in');
                            },
                          },
                        ],
                      );
                    } catch (e: any) {
                      Alert.alert('Could not delete', e?.message ?? 'Try again.');
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  disabled={deleting || confirmText.trim().toUpperCase() !== 'DELETE'}
                  style={({ pressed }) => [
                    styles.dangerConfirm,
                    (deleting || confirmText.trim().toUpperCase() !== 'DELETE') && { opacity: 0.5 },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.dangerConfirmText}>
                    {deleting ? 'Deleting…' : 'Delete forever'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setDeleteOpen(true)}
              style={({ pressed }) => [styles.dangerOpen, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.dangerOpenText}>Continue to delete</Text>
              <Ionicons name="chevron-down" size={16} color={colors.danger} />
            </Pressable>
          )}
        </View>
      </ScrollView>

      <PetPickerSheet
        visible={petPickerOpen}
        pets={pets}
        onClose={() => setPetPickerOpen(false)}
        onPick={pet => {
          setPetPickerOpen(false);
          setPdfPetId(pet.id);
        }}
      />

      {pdfPetId ? (
        <PdfExportRunner
          petId={pdfPetId}
          onDone={() => setPdfPetId(null)}
        />
      ) : null}
    </Screen>
  );
}

// Bottom sheet pet picker for the records book PDF. Lives inline
// since this is the only consumer for now.
function PetPickerSheet({
  visible,
  pets,
  onClose,
  onPick,
}: {
  visible: boolean;
  pets: Pet[];
  onClose: () => void;
  onPick: (pet: Pet) => void;
}) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetGrabber} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Pick a pet</Text>
            <Pressable onPress={onClose} hitSlop={10} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <Text style={styles.sheetIntro}>
            Each pet exports as its own PDF so vets and sitters get exactly the
            file they need.
          </Text>
          <ScrollView style={{ marginTop: spacing.sm }}>
            {pets.map(pet => (
              <Pressable
                key={pet.id}
                onPress={() => onPick(pet)}
                style={({ pressed }) => [
                  styles.sheetRow,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <PetAvatar pet={pet} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetRowTitle}>{pet.name}</Text>
                  {pet.species ? (
                    <Text style={styles.sheetRowSub}>{pet.species}</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Tiny shim component that fetches per-pet vaccines/entries and fires
// the share PDF flow. Mounted only while a pet is selected for export
// so the hooks subscribe and tear down cleanly.
function PdfExportRunner({ petId, onDone }: { petId: string; onDone: () => void }) {
  const { user, profile } = useAuth();
  const { pets } = useData();
  const vaccines = useVaccinesForPet(petId);
  const entries = useEntriesForPet(petId);

  React.useEffect(() => {
    const pet = pets.find(p => p.id === petId);
    if (!pet) {
      onDone();
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await sharePetHealthPdf({
          pet,
          profile,
          vaccines,
          recentEntries: entries.slice(0, 20),
          medications: entries.filter(e => e.type === 'medication'),
        });
      } catch (e: any) {
        if (!cancelled) {
          Alert.alert('Could not generate PDF', e?.message ?? 'Try again.');
        }
      } finally {
        if (!cancelled) onDone();
      }
    })();
    return () => {
      cancelled = true;
    };
    // We deliberately fire once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

  return null;
}

function ExportCard({
  icon,
  title,
  body,
  ctaLabel,
  ctaBadge,
  onPress,
  disabled,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  ctaLabel: string;
  ctaBadge?: string;
  onPress: () => void;
  disabled?: boolean;
  tone: 'primary' | 'accent';
}) {
  return (
    <View style={[styles.card, tone === 'primary' ? styles.cardPrimary : styles.cardAccent]}>
      <View style={[styles.cardIcon, tone === 'primary' ? styles.cardIconPrimary : styles.cardIconAccent]}>
        <Ionicons name={icon} size={22} color={tone === 'primary' ? colors.primary : colors.warning} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardBody}>{body}</Text>
        <Pressable
          onPress={onPress}
          disabled={disabled}
          style={({ pressed }) => [
            styles.cardCta,
            tone === 'primary' ? styles.ctaPrimary : styles.ctaOutline,
            disabled && { opacity: 0.5 },
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={[styles.cardCtaText, tone === 'primary' ? { color: '#fff' } : { color: colors.text }]}>
            {ctaLabel}
          </Text>
          {ctaBadge ? (
            <View style={styles.plusBadge}>
              <Text style={styles.plusBadgeText}>{ctaBadge}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['2xl'], gap: spacing.md },
  header: { gap: spacing.xs, marginBottom: spacing.sm },
  intro: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },

  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPrimary: { backgroundColor: colors.primarySoft, borderColor: colors.primary + '33' },
  cardAccent: { backgroundColor: colors.warningSoft, borderColor: colors.warning + '33' },
  cardIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  cardIconPrimary: {},
  cardIconAccent: {},
  cardTitle: { fontSize: 15, fontFamily: fonts.body.semibold, color: colors.text },
  cardBody: { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginTop: 4 },
  cardCta: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: 10,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  ctaPrimary: { backgroundColor: colors.primary },
  ctaOutline: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  cardCtaText: { fontSize: 13, fontFamily: fonts.body.semibold },
  plusBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  plusBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },

  trustBox: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  trustIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  trustTitle: { fontSize: 13, fontFamily: fonts.body.semibold, color: colors.text },
  trustBody: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginTop: 2 },

  dangerCard: {
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger + '33',
    backgroundColor: colors.dangerSoft,
    padding: spacing.base,
  },
  dangerHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  dangerIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  dangerTitle: { fontSize: 14, fontFamily: fonts.body.semibold, color: '#991b1b' },
  dangerBody: { fontSize: 12, color: '#991b1b', marginTop: 2, lineHeight: 17, opacity: 0.85 },

  dangerOpen: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.danger + '55',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  dangerOpenText: { fontSize: 13, fontFamily: fonts.body.semibold, color: colors.danger },

  dangerBox: { marginTop: spacing.md, gap: spacing.sm },
  dangerWarning: { fontSize: 13, color: '#991b1b', lineHeight: 18 },
  dangerBullets: { fontSize: 12, color: '#991b1b', lineHeight: 19, opacity: 0.9 },
  dangerInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.danger + '55',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: fonts.display.bold,
    color: colors.danger,
    letterSpacing: 4,
    textAlign: 'center',
  },
  dangerActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  dangerCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  dangerCancelText: { fontSize: 13, fontFamily: fonts.body.semibold, color: colors.text },
  dangerConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
  },
  dangerConfirmText: { fontSize: 13, fontFamily: fonts.body.semibold, color: '#fff' },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    maxHeight: '70%',
  },
  sheetGrabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  sheetTitle: { flex: 1, fontSize: 18, fontFamily: fonts.display.bold, color: colors.text },
  sheetIntro: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  sheetRowTitle: { fontSize: 15, fontFamily: fonts.body.semibold, color: colors.text },
  sheetRowSub: { fontSize: 12, color: colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
});
