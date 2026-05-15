import React, { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useData } from '@/hooks/useData';
import { colors, radius, spacing } from '@/theme';
import { fmtDate, fmtPetAge, daysUntil } from '@/utils/dates';
import { fmtWeight } from '@/utils/units';
import { SPECIES_LABEL, SPECIES_EMOJI } from '@/utils/petIcon';
import { canonicalizeVaccineName } from '@/utils/vaccineNames';

/**
 * Pet emergency card — designed to be readable at a glance by a vet, sitter,
 * or stranger. High-contrast, large type, tap-to-call buttons. Reads as a
 * physical "ID card" rather than a settings screen.
 */
export default function EmergencyCardScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pets, vaccines, medications } = useData();

  const pet = pets.find(p => p.id === id);
  const activeMeds = useMemo(
    () => medications.filter(m => m.petId === id && m.isActive),
    [medications, id],
  );
  const recentVaccines = useMemo(
    () => vaccines
      .filter(v => v.petId === id)
      .sort((a, b) => +new Date(b.dateGiven) - +new Date(a.dateGiven))
      .slice(0, 5),
    [vaccines, id],
  );

  if (!pet) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: 'Emergency' }} />
        <Text>Pet not found.</Text>
      </View>
    );
  }

  const callVet = () => {
    if (pet.vetPhone) Linking.openURL(`tel:${pet.vetPhone.replace(/[^\d+]/g, '')}`);
  };
  const callEmergency = () => {
    if (pet.emergencyContactPhone) Linking.openURL(`tel:${pet.emergencyContactPhone.replace(/[^\d+]/g, '')}`);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Stack.Screen options={{ title: 'Emergency Card', headerBackButtonDisplayMode: 'minimal' }} />

      {/* Hero — big ID-card feel */}
      <View style={styles.hero}>
        {pet.photoUrl ? (
          <Image source={{ uri: pet.photoUrl }} style={styles.heroPhoto} contentFit="cover" />
        ) : (
          <View style={[styles.heroPhoto, styles.heroPhotoEmpty]}>
            <Text style={{ fontSize: 56 }}>{SPECIES_EMOJI[pet.species] ?? '🐾'}</Text>
          </View>
        )}
        <Text style={styles.heroName}>{pet.name}</Text>
        <Text style={styles.heroSub}>
          {SPECIES_LABEL[pet.species]}
          {pet.breed ? ` · ${pet.breed}` : ''}
          {fmtPetAge(pet.birthday, pet.approxAgeMonths) ? ` · ${fmtPetAge(pet.birthday, pet.approxAgeMonths)}` : ''}
        </Text>
        {pet.weightKg != null ? (
          <Text style={styles.heroSub}>{fmtWeight(pet.weightKg)}</Text>
        ) : null}
      </View>

      {/* Critical: allergies + emergency notes */}
      {pet.allergies ? (
        <Card tone="danger" icon="warning-outline" title="Allergies">
          <Text style={styles.criticalText}>{pet.allergies}</Text>
        </Card>
      ) : null}
      {pet.emergencyNotes ? (
        <Card tone="danger" icon="medical-outline" title="Emergency notes">
          <Text style={styles.criticalText}>{pet.emergencyNotes}</Text>
        </Card>
      ) : null}

      {/* Tap-to-call contacts */}
      <Card tone="primary" icon="call-outline" title="Vet">
        {pet.vetName ? <Text style={styles.contactName}>{pet.vetName}</Text> : null}
        {pet.vetPhone ? (
          <Pressable onPress={callVet} style={({ pressed }) => [styles.callBtn, pressed && { opacity: 0.85 }]}>
            <Ionicons name="call" size={16} color="#fff" />
            <Text style={styles.callBtnText}>{pet.vetPhone}</Text>
          </Pressable>
        ) : (
          <Text style={styles.muted}>No vet phone on file</Text>
        )}
      </Card>

      {(pet.emergencyContactName || pet.emergencyContactPhone) ? (
        <Card tone="primary" icon="person-outline" title="Emergency contact">
          {pet.emergencyContactName ? <Text style={styles.contactName}>{pet.emergencyContactName}</Text> : null}
          {pet.emergencyContactPhone ? (
            <Pressable onPress={callEmergency} style={({ pressed }) => [styles.callBtn, pressed && { opacity: 0.85 }]}>
              <Ionicons name="call" size={16} color="#fff" />
              <Text style={styles.callBtnText}>{pet.emergencyContactPhone}</Text>
            </Pressable>
          ) : null}
        </Card>
      ) : null}

      {/* IDs */}
      <Card tone="muted" icon="finger-print-outline" title="Identification">
        <InfoRow label="Date of birth" value={pet.birthday ? fmtDate(pet.birthday) : 'Unknown'} />
        <InfoRow label="Microchip" value={pet.microchip || 'Not registered'} />
        <InfoRow label="Insurance" value={pet.insurance || 'None'} />
      </Card>

      {/* Active medications */}
      {activeMeds.length > 0 ? (
        <Card tone="muted" icon="medkit-outline" title="Current medications">
          {activeMeds.map(m => (
            <View key={m.id} style={styles.medLine}>
              <Text style={styles.medName}>{m.name}</Text>
              <Text style={styles.medMeta}>
                {m.dosage ? `${m.dosage} · ` : ''}{frequencyShort(m.frequency)}
                {m.instructions ? ` · ${m.instructions}` : ''}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      {/* Recent vaccinations */}
      {recentVaccines.length > 0 ? (
        <Card tone="muted" icon="shield-checkmark-outline" title="Vaccine status">
          {recentVaccines.map(v => {
            const days = v.expirationDate ? daysUntil(v.expirationDate) : null;
            let status = '';
            if (days != null) status = days < 0 ? 'Expired' : days <= 30 ? `Expires in ${days}d` : 'Current';
            return (
              <View key={v.id} style={styles.vaccLine}>
                <Text style={styles.vaccName}>{canonicalizeVaccineName(v.vaccineName)}</Text>
                <Text style={[styles.vaccStatus, days != null && days < 0 && { color: colors.danger, fontWeight: '700' }]}>
                  {v.expirationDate ? fmtDate(v.expirationDate) : fmtDate(v.dateGiven)}{status ? ` · ${status}` : ''}
                </Text>
              </View>
            );
          })}
        </Card>
      ) : null}

      <Text style={styles.footer}>Generated by PawProof · Not a medical document</Text>
    </ScrollView>
  );
}

function Card({ tone, icon, title, children }: {
  tone: 'danger' | 'primary' | 'muted';
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: React.ReactNode;
}) {
  const styleByTone = tone === 'danger' ? cardTones.danger : tone === 'primary' ? cardTones.primary : cardTones.muted;
  return (
    <View style={[styles.card, { backgroundColor: styleByTone.bg, borderColor: styleByTone.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: styleByTone.iconBg }]}>
          <Ionicons name={icon} size={16} color={styleByTone.iconColor} />
        </View>
        <Text style={[styles.cardTitle, { color: styleByTone.titleColor }]}>{title}</Text>
      </View>
      <View style={{ gap: 6 }}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function frequencyShort(f: string): string {
  const map: Record<string, string> = {
    once_daily: '1x daily', twice_daily: '2x daily', three_times_daily: '3x daily',
    every_other_day: 'every 2 days', weekly: 'weekly', monthly: 'monthly', as_needed: 'as needed',
  };
  return map[f] ?? f;
}

const cardTones = {
  danger:  { bg: colors.dangerSoft,  border: colors.danger + '40',  iconBg: '#fbd5d5', iconColor: '#991b1b', titleColor: '#991b1b' },
  primary: { bg: colors.primarySoft, border: colors.primary + '40', iconBg: '#cfe9ef', iconColor: colors.primaryDark, titleColor: colors.primaryDark },
  muted:   { bg: colors.card,        border: colors.border,         iconBg: colors.cardSubtle, iconColor: colors.textMuted, titleColor: colors.textMuted },
};

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

  hero: { alignItems: 'center', gap: 4, paddingVertical: spacing.lg },
  heroPhoto: { width: 140, height: 140, borderRadius: 32, backgroundColor: colors.primarySoft },
  heroPhotoEmpty: { alignItems: 'center', justifyContent: 'center' },
  heroName: { fontSize: 32, fontWeight: '800', color: colors.text, marginTop: spacing.sm, letterSpacing: -0.5 },
  heroSub: { fontSize: 15, color: colors.textMuted },

  card: { padding: spacing.md, borderRadius: radius.lg, gap: spacing.sm, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },

  criticalText: { fontSize: 17, color: colors.text, fontWeight: '600', lineHeight: 22 },

  contactName: { fontSize: 16, fontWeight: '600', color: colors.text },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12, paddingHorizontal: spacing.base,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  callBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  infoValue: { fontSize: 14, color: colors.text, flexShrink: 1, textAlign: 'right' },

  medLine: { paddingVertical: 4 },
  medName: { fontSize: 14, fontWeight: '600', color: colors.text },
  medMeta: { fontSize: 12, color: colors.textMuted },

  vaccLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  vaccName: { fontSize: 14, fontWeight: '600', color: colors.text },
  vaccStatus: { fontSize: 12, color: colors.textMuted },

  muted: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
  footer: { fontSize: 11, color: colors.textFaint, textAlign: 'center', marginTop: spacing.md },
});
