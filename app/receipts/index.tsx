import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Chip } from '@/components/Chip';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/hooks/AuthProvider';
import { useData } from '@/hooks/useData';
import { deleteReceipt } from '@/lib/firestore';
import {
  RECEIPT_CATEGORY_META,
  formatAmount,
  receiptCategoryLabel,
} from '@/utils/receiptCategory';
import { fmtDate } from '@/utils/dates';
import { colors, radius, spacing, typography } from '@/theme';
import type { Receipt, ReceiptCategory } from '@/types/models';

// Time ranges for the spending summary.
const RANGES: { key: string; label: string; days: number | null }[] = [
  { key: '30', label: '30 days', days: 30 },
  { key: '90', label: '90 days', days: 90 },
  { key: '365', label: 'Year', days: 365 },
  { key: 'all', label: 'All', days: null },
];

export default function ReceiptsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { receipts, pets } = useData();
  const [rangeKey, setRangeKey] = useState('90');

  const range = RANGES.find(r => r.key === rangeKey) ?? RANGES[1];

  const inRange = useMemo(() => {
    if (range.days == null) return receipts;
    const cutoff = Date.now() - range.days * 86_400_000;
    return receipts.filter(r => {
      const t = new Date(r.date).getTime();
      return Number.isNaN(t) ? true : t >= cutoff;
    });
  }, [receipts, range.days]);

  const total = useMemo(
    () => inRange.reduce((sum, r) => sum + (r.amount ?? 0), 0),
    [inRange],
  );

  // Category breakdown, sorted by spend desc.
  const byCategory = useMemo(() => {
    const map = new Map<ReceiptCategory, number>();
    for (const r of inRange) {
      map.set(r.category, (map.get(r.category) ?? 0) + (r.amount ?? 0));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [inRange]);

  const petName = (petId: string | null) =>
    petId ? pets.find(p => p.id === petId)?.name ?? 'Pet' : 'Household';

  const confirmDelete = (r: Receipt) => {
    Alert.alert('Delete receipt?', `Remove ${r.vendor} (${formatAmount(r.amount)})?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!user) return;
          try {
            await deleteReceipt(user.uid, r.id);
          } catch (e: any) {
            Alert.alert('Could not delete', e?.message ?? 'Try again.');
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: 'Spending',
          headerRight: () => (
            <Pressable onPress={() => router.push('/receipt/scan' as never)} hitSlop={10} style={{ marginRight: 4 }}>
              <Ionicons name="add" size={26} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Range filter */}
        <View style={styles.rangeRow}>
          {RANGES.map(r => (
            <Chip key={r.key} label={r.label} selected={rangeKey === r.key} onPress={() => setRangeKey(r.key)} />
          ))}
        </View>

        {/* Total */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total spent</Text>
          <Text style={styles.totalValue}>{formatAmount(total)}</Text>
          <Text style={styles.totalSub}>
            {inRange.length} receipt{inRange.length === 1 ? '' : 's'} · {range.label.toLowerCase()}
          </Text>
        </View>

        {receipts.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="receipt-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No receipts yet</Text>
            <Text style={styles.emptyBody}>
              Scan a receipt for food, grooming, toys, or supplies to start tracking
              what you spend on your pets.
            </Text>
            <PrimaryButton
              title="Scan a receipt"
              icon="camera-outline"
              onPress={() => router.push('/receipt/scan' as never)}
              style={{ marginTop: spacing.md }}
            />
          </View>
        ) : (
          <>
            {/* Category breakdown */}
            {byCategory.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>By category</Text>
                <View style={styles.card}>
                  {byCategory.map(([cat, amt], idx) => {
                    const meta = RECEIPT_CATEGORY_META[cat];
                    const pct = total > 0 ? Math.round((amt / total) * 100) : 0;
                    return (
                      <View key={cat} style={[styles.catRow, idx > 0 && styles.divider]}>
                        <View style={[styles.catIcon, { backgroundColor: meta.tint + '22' }]}>
                          <Ionicons name={meta.icon} size={16} color={meta.tint} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.catName}>{meta.label}</Text>
                          <View style={styles.barTrack}>
                            <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: meta.tint }]} />
                          </View>
                        </View>
                        <Text style={styles.catAmt}>{formatAmount(amt)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Receipt list */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Receipts</Text>
              <View style={styles.card}>
                {inRange.length === 0 ? (
                  <Text style={styles.muted}>No receipts in this range.</Text>
                ) : (
                  inRange.map((r, idx) => {
                    const meta = RECEIPT_CATEGORY_META[r.category];
                    return (
                      <Pressable
                        key={r.id}
                        onLongPress={() => confirmDelete(r)}
                        style={[styles.receiptRow, idx > 0 && styles.divider]}
                      >
                        <View style={[styles.catIcon, { backgroundColor: meta.tint + '22' }]}>
                          <Ionicons name={meta.icon} size={16} color={meta.tint} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.receiptVendor} numberOfLines={1}>{r.vendor}</Text>
                          <Text style={styles.receiptSub}>
                            {receiptCategoryLabel(r.category)} · {fmtDate(r.date)} · {petName(r.petId)}
                          </Text>
                        </View>
                        <Text style={styles.receiptAmt}>{formatAmount(r.amount)}</Text>
                      </Pressable>
                    );
                  })
                )}
              </View>
              <Text style={styles.hint}>Long-press a receipt to delete it.</Text>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.md },
  rangeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  empty: { alignItems: 'center', paddingVertical: spacing.xl, gap: 6 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  emptyBody: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 320 },

  totalCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  totalLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: colors.primaryDark },
  totalValue: { fontSize: 40, fontWeight: '800', color: colors.primaryDark, marginTop: 4, letterSpacing: -1 },
  totalSub: { fontSize: 13, color: colors.primaryDark, opacity: 0.8, marginTop: 2 },

  section: { gap: 6 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, color: colors.textMuted, textTransform: 'uppercase', marginLeft: 4 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
  muted: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },

  catRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 10 },
  catIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 14, fontWeight: '600', color: colors.text },
  catAmt: { fontSize: 15, fontWeight: '700', color: colors.text },
  barTrack: { height: 5, borderRadius: 3, backgroundColor: colors.cardSubtle, marginTop: 5, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },

  receiptRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 10 },
  receiptVendor: { fontSize: 15, fontWeight: '600', color: colors.text },
  receiptSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  receiptAmt: { fontSize: 15, fontWeight: '700', color: colors.text },
  hint: { fontSize: 11, color: colors.textFaint, marginLeft: 4, marginTop: 4 },
});
