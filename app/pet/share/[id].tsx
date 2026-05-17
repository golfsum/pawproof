import React, { useEffect, useState } from 'react';
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
import { Stack, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Chip } from '@/components/Chip';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/hooks/AuthProvider';
import { useData, usePet } from '@/hooks/useData';
import {
  createShareInvite,
  revokeShareInvite,
  watchSharesForPet,
} from '@/lib/firestore';
import { colors, fonts, radius, spacing, typography } from '@/theme';
import type { PetShare, ShareRole } from '@/types/models';
import { fmtDate } from '@/utils/dates';

// Per-pet caregiver invite management. Owner can:
//  - send an invite by email + pick a role
//  - copy the invite code to share manually
//  - revoke any pending or accepted share
//
// Acceptance happens on the invitee's device via Settings → Accept
// invite. The shared-pet reads themselves require a Firestore rule
// change (see README); this screen is fully usable without it.

export default function PetShareScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const petId = String(params.id ?? '');
  const pet = usePet(petId);
  const { user, profile } = useAuth();

  const [shares, setShares] = useState<PetShare[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ShareRole>('caregiver');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!petId) return;
    const unsub = watchSharesForPet(petId, setShares);
    return () => unsub();
  }, [petId]);

  const handleInvite = async () => {
    if (!user || !pet) return;
    const trimmed = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      Alert.alert('Email needed', 'Enter the email of the person you want to share with.');
      return;
    }
    if (
      shares.some(s => s.inviteeEmail === trimmed && s.status !== 'revoked')
    ) {
      Alert.alert('Already invited', `${trimmed} already has an active or pending invite for ${pet.name}.`);
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
        inviteeEmail: trimmed,
        role,
      });
      setEmail('');
      const message = `${profile?.displayName ?? 'A PawProof user'} invited you to help care for ${pet.name}. Open PawProof → Settings → Accept invite, then paste this code:\n\n${share.inviteCode.toUpperCase()}`;
      Alert.alert(
        'Invite sent',
        `Code: ${share.inviteCode.toUpperCase()}. Share it with ${trimmed} so they can accept.`,
        [
          { text: 'Done', style: 'cancel' },
          {
            text: 'Share',
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

  const visibleShares = shares.filter(s => s.status !== 'revoked');

  return (
    <Screen>
      <Stack.Screen options={{ title: pet ? `Share ${pet.name}` : 'Share' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.intro}>
            <View style={styles.introIcon}>
              <Ionicons name="people-outline" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={typography.h2}>Share {pet?.name ?? 'this pet'}</Text>
              <Text style={styles.introBody}>
                Invite a partner, family member, roommate, or pet sitter
                so they can log care and see records. You can revoke
                access anytime.
              </Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>Invite by email</Text>
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
              title="Send invite"
              onPress={handleInvite}
              loading={busy}
              disabled={!email.trim()}
              icon="paper-plane-outline"
              style={{ marginTop: spacing.md }}
            />
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <Text style={styles.sectionLabel}>People with access ({visibleShares.length})</Text>
            {visibleShares.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  No one else has access yet. Send an invite above to get started.
                </Text>
              </View>
            ) : (
              visibleShares.map(s => (
                <View key={s.id} style={styles.shareRow}>
                  <View style={styles.shareAvatar}>
                    <Ionicons
                      name={s.status === 'accepted' ? 'person' : 'mail-outline'}
                      size={18}
                      color={s.status === 'accepted' ? colors.primary : colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shareEmail} numberOfLines={1}>
                      {s.inviteeEmail}
                    </Text>
                    <Text style={styles.shareMeta}>
                      {s.role === 'caregiver' ? 'Caregiver' : 'View only'} ·{' '}
                      {s.status === 'accepted'
                        ? `Accepted ${fmtDate(s.acceptedAt ?? s.createdAt)}`
                        : `Invited ${fmtDate(s.createdAt)} · code ${s.inviteCode.toUpperCase()}`}
                    </Text>
                  </View>
                  <Pressable onPress={() => handleRevoke(s)} hitSlop={8} style={styles.revokeBtn}>
                    <Text style={styles.revokeText}>Revoke</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>

          <View style={styles.comingSoonBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.comingSoonText}>
              The invitee can accept under Settings → Accept invite using the
              6-character code, then they'll see {pet?.name ?? 'this pet'} alongside their own.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  intro: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  introIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  introBody: { fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 18 },

  formCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.base,
  },
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

  sectionLabel: {
    fontSize: 12,
    fontFamily: fonts.body.semibold,
    color: colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginLeft: 2,
  },
  empty: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },

  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  shareAvatar: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  shareEmail: { fontSize: 14, fontFamily: fonts.body.semibold, color: colors.text },
  shareMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  revokeBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  revokeText: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.danger },

  comingSoonBox: {
    flexDirection: 'row',
    gap: 8,
    padding: spacing.md,
    marginTop: spacing.lg,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
  },
  comingSoonText: { flex: 1, fontSize: 12, color: colors.primaryDark, lineHeight: 17 },
});
