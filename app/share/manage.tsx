import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Chip } from '@/components/Chip';
import { PetAvatar } from '@/components/PetAvatar';
import { PetPicker } from '@/components/PetPicker';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Toast } from '@/components/Toast';
import { useAuth } from '@/hooks/AuthProvider';
import { useData } from '@/hooks/useData';
import {
  createShareInvite,
  revokeShareInvite,
  watchOutgoingShares,
} from '@/lib/firestore';
import { colors, fonts, radius, spacing, typography } from '@/theme';
import type { PetShare, ShareRole } from '@/types/models';
import { fmtDate } from '@/utils/dates';

// Settings → Manage people. Central place to:
//  - send a new invite for any pet on the account
//  - see everyone currently invited or accepted, grouped by pet
//  - revoke from a single tap
//  - jump to the per-pet share screen for the full details
//
// Mirrors the pet-profile share screen but global, so users don't
// have to bounce between pet profiles to find a pending invite.

const ROLE_LABEL: Record<ShareRole, string> = {
  caregiver: 'Caregiver',
  view_only: 'View only',
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const isValidEmail = (s: string) => EMAIL_RE.test(s.trim().toLowerCase());

export default function ManagePeopleScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { pets, receivedShares } = useData();

  const [outgoing, setOutgoing] = useState<PetShare[]>([]);
  const [loading, setLoading] = useState(true);

  const [petId, setPetId] = useState<string | null>(pets[0]?.id ?? null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ShareRole>('caregiver');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const trimmedEmail = email.trim().toLowerCase();
  const emailValid = useMemo(() => isValidEmail(email), [email]);
  const canInvite = !busy && !!petId && pets.length > 0 && emailValid;

  useEffect(() => {
    if (!user) return;
    const unsub = watchOutgoingShares(user.uid, list => {
      setOutgoing(list);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  // Default the pet picker to the first pet once data loads.
  useEffect(() => {
    if (petId === null && pets.length > 0) {
      setPetId(pets[0].id);
    }
  }, [pets, petId]);

  const handleInvite = async () => {
    if (!user || !canInvite) return;
    const pet = pets.find(p => p.id === petId);
    if (!pet) return;
    if (
      outgoing.some(
        s => s.petId === petId && s.inviteeEmail === trimmedEmail && s.status !== 'revoked',
      )
    ) {
      Alert.alert(
        'Already invited',
        `${trimmedEmail} already has an active or pending invite for ${pet.name}.`,
      );
      return;
    }
    setBusy(true);
    try {
      const share = await createShareInvite({
        petId,
        petName: pet.name,
        ownerUid: user.uid,
        ownerEmail: user.email ?? null,
        ownerName: profile?.displayName ?? user.displayName ?? null,
        inviteeEmail: trimmedEmail,
        role,
      });
      const invited = trimmedEmail;
      setEmail('');
      setToast(`Invite sent to ${invited}.`);
      const message = `${profile?.displayName ?? 'A PawProof user'} invited you to help care for ${pet.name}. Open PawProof → Settings → Accept invite, then paste this code:\n\n${share.inviteCode.toUpperCase()}`;
      // Offer the share sheet so the owner can hand the code off in
      // whatever messaging app they prefer. The pending invite (with
      // code) also stays visible in the list below, so dismissing this
      // doesn't lose anything.
      Alert.alert(
        'Code ready to share',
        `${share.inviteCode.toUpperCase()} — send this to ${invited} so they can accept.`,
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Share code',
            onPress: () => {
              Share.share({ message }).catch(() => {});
            },
          },
        ],
      );
    } catch (e: any) {
      Alert.alert('Could not invite', e?.message ?? 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = (share: PetShare) => {
    const label = share.status === 'pending' ? 'cancel this invite' : 'remove access';
    Alert.alert('Revoke?', `${label} for ${share.inviteeEmail}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          try {
            await revokeShareInvite(share.id);
          } catch (e: any) {
            Alert.alert('Could not revoke', e?.message ?? 'Try again.');
          }
        },
      },
    ]);
  };

  // Group active outgoing shares by pet so the user sees who has
  // access to each one at a glance.
  const activeOutgoing = outgoing.filter(s => s.status !== 'revoked');
  const sharesByPet = activeOutgoing.reduce<Record<string, PetShare[]>>((acc, s) => {
    (acc[s.petId] ??= []).push(s);
    return acc;
  }, {});

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Manage people' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={typography.h1}>People with access</Text>
          <Text style={styles.intro}>
            Invite a partner, family member, roommate, or pet sitter to log
            care and see records. Revoke access anytime.
          </Text>

          {/* Invite form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Invite someone new</Text>

            {pets.length === 0 ? (
              <>
                <Text style={[styles.label, { marginTop: spacing.sm }]}>Pet access</Text>
                <Text style={styles.emptyHint}>
                  Add a pet first, then come back here to invite someone.
                </Text>
              </>
            ) : (
              <View style={{ marginTop: spacing.sm }}>
                <PetPicker
                  pets={pets}
                  selectedId={petId}
                  onSelect={setPetId}
                  label="Pet access"
                />
              </View>
            )}

            <Text style={[styles.label, { marginTop: spacing.md }]}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="caregiver@example.com"
              placeholderTextColor={colors.textFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />

            <Text style={[styles.label, { marginTop: spacing.md }]}>Role</Text>
            <View style={styles.chipRow}>
              <Chip
                label="Caregiver"
                selected={role === 'caregiver'}
                onPress={() => setRole('caregiver')}
              />
              <Chip
                label="View only"
                selected={role === 'view_only'}
                onPress={() => setRole('view_only')}
              />
            </View>
            <Text style={styles.roleHint}>
              {role === 'caregiver'
                ? 'Can view records and log meals, walks, meds, and notes.'
                : 'Can view records and reminders. Cannot make changes.'}
            </Text>

            <PrimaryButton
              title={busy ? 'Sending invite…' : 'Send invite'}
              onPress={handleInvite}
              loading={busy}
              disabled={!canInvite}
              icon="paper-plane-outline"
              style={{ marginTop: spacing.md }}
            />
            {email.trim().length > 0 && !emailValid ? (
              <Text style={styles.fieldHint}>
                Enter a valid email like caregiver@example.com.
              </Text>
            ) : null}
          </View>

          {/* Outgoing shares grouped by pet */}
          <Text style={styles.sectionLabel}>
            People you've invited ({activeOutgoing.length})
          </Text>
          {loading ? (
            <Text style={styles.loadingText}>Loading…</Text>
          ) : activeOutgoing.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                You haven't invited anyone yet. Use the form above to send your first invite.
              </Text>
            </View>
          ) : (
            Object.entries(sharesByPet).map(([pId, shares]) => {
              const pet = pets.find(p => p.id === pId);
              return (
                <View key={pId} style={styles.petBlock}>
                  <View style={styles.petBlockHeader}>
                    {pet ? <PetAvatar pet={pet} size={28} /> : (
                      <View style={styles.unknownPet}>
                        <Ionicons name="paw-outline" size={16} color={colors.textMuted} />
                      </View>
                    )}
                    <Text style={styles.petBlockName}>{pet?.name ?? shares[0].petName ?? 'Pet'}</Text>
                    {pet ? (
                      <Pressable
                        onPress={() => router.push({ pathname: '/pet/share/[id]', params: { id: pet.id } })}
                        hitSlop={6}
                      >
                        <Text style={styles.petBlockLink}>Open</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {shares.map(s => (
                    <View key={s.id} style={styles.shareRow}>
                      <View style={styles.shareAvatar}>
                        <Ionicons
                          name={s.status === 'accepted' ? 'person' : 'mail-outline'}
                          size={16}
                          color={s.status === 'accepted' ? colors.primary : colors.textMuted}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.shareEmail} numberOfLines={1}>
                          {s.inviteeEmail}
                        </Text>
                        <Text style={styles.shareMeta}>
                          {ROLE_LABEL[s.role]} ·{' '}
                          {s.status === 'accepted'
                            ? `Accepted ${fmtDate(s.acceptedAt ?? s.createdAt)}`
                            : `Invited ${fmtDate(s.createdAt)} · ${s.inviteCode.toUpperCase()}`}
                        </Text>
                      </View>
                      <Pressable onPress={() => handleRevoke(s)} hitSlop={8} style={styles.revokeBtn}>
                        <Text style={styles.revokeText}>Revoke</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              );
            })
          )}

          {/* Incoming — pets shared with this user */}
          {receivedShares.length > 0 ? (
            <>
              <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
                Shared with you ({receivedShares.length})
              </Text>
              {receivedShares.map(s => (
                <View key={s.id} style={styles.incomingRow}>
                  <View style={styles.shareAvatar}>
                    <Ionicons name="people-outline" size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shareEmail} numberOfLines={1}>
                      {s.petName}
                    </Text>
                    <Text style={styles.shareMeta}>
                      Shared by {s.ownerName ?? s.ownerEmail ?? 'an owner'} · {ROLE_LABEL[s.role]}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast
        message={toast}
        onHidden={() => setToast(null)}
        bottomOffset={32}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['2xl'], gap: spacing.sm },
  intro: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginTop: 4 },

  formCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginTop: spacing.md,
  },
  formTitle: { fontSize: 15, fontFamily: fonts.body.semibold, color: colors.text },
  label: { fontSize: 13, fontFamily: fonts.body.semibold, color: colors.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  chipRow: { flexDirection: 'row', gap: 8 },
  roleHint: { fontSize: 12, color: colors.textMuted, marginTop: 8, lineHeight: 17 },
  emptyHint: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },
  fieldHint: { fontSize: 12, color: colors.danger, marginTop: 6 },

  sectionLabel: {
    fontSize: 12,
    fontFamily: fonts.body.semibold,
    color: colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: 2,
  },
  loadingText: { textAlign: 'center', color: colors.textMuted, fontSize: 13, paddingVertical: spacing.lg },
  empty: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },

  petBlock: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  petBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xs,
  },
  petBlockName: { flex: 1, fontSize: 14, fontFamily: fonts.display.bold, color: colors.text },
  petBlockLink: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.primary },
  unknownPet: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.cardSubtle,
    alignItems: 'center', justifyContent: 'center',
  },

  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  incomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary + '33',
    marginBottom: spacing.sm,
  },
  shareAvatar: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: colors.cardSubtle,
    alignItems: 'center', justifyContent: 'center',
  },
  shareEmail: { fontSize: 14, fontFamily: fonts.body.semibold, color: colors.text },
  shareMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  revokeBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  revokeText: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.danger },
});
