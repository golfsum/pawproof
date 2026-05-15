import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { differenceInDays } from 'date-fns';
import { PetAvatar } from './PetAvatar';
import { colors, radius, spacing } from '@/theme';
import { fmtDate, isOverdue, daysUntil } from '@/utils/dates';
import { REMINDER_META } from '@/utils/petIcon';
import { generateInsights } from '@/utils/insights';
import { canonicalizeReminderTitle } from '@/utils/vaccineNames';
import type { Pet, Reminder, JournalEntry } from '@/types/models';

/** A single thing demanding attention on a pet — could be a reminder
 *  past due, a reminder due today, or a behavioural pattern from the
 *  insights system (no walk in 3 days, missed meal, recurring symptom, etc). */
export interface NeedsItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  title: string;
  detail: string;
  /** Sort key — lower numbers surface first inside the tree. */
  weight: number;
  /** Reminders carry their source so the parent can wire Mark Done. */
  reminder?: Reminder;
  /** True for vaccine reminders — they suppress the green check button. */
  isVaccine?: boolean;
}

/**
 * Build the full list of things that need attention for one pet.
 * Combines overdue reminders, today's reminders, and any warning/danger
 * insights from the journal. Returned sorted from most-urgent to least.
 */
export function buildPetNeedsItems(
  pet: Pet,
  reminders: Reminder[],
  entries: JournalEntry[],
): NeedsItem[] {
  const items: NeedsItem[] = [];
  const petReminders = reminders.filter(r => r.petId === pet.id && !r.isCompleted);

  // Overdue reminders
  for (const r of petReminders.filter(r => isOverdue(r.dueDate))) {
    const meta = REMINDER_META[r.type] ?? REMINDER_META.custom;
    const days = Math.abs(differenceInDays(new Date(), new Date(r.dueDate)));
    const isVaccine = r.type === 'vaccination';
    const title = isVaccine ? canonicalizeReminderTitle(r.title) : r.title;
    // Vaccines are "expired" past their due date, not "overdue" — softer
    // and more accurate language for renewals that may be months/years late.
    const detail = isVaccine
      ? `Expired ${fmtDate(r.dueDate)}`
      : days === 0 ? 'Overdue' : days === 1 ? 'Overdue 1 day' : `Overdue ${days} days`;
    items.push({
      id: `rem-${r.id}`,
      icon: meta.icon as any,
      tint: colors.danger,
      title,
      detail,
      weight: 0 - days, // older overdue = lower weight = higher priority
      reminder: r,
      isVaccine,
    });
  }

  // Due today (not overdue)
  for (const r of petReminders.filter(r => {
    if (isOverdue(r.dueDate)) return false;
    const d = daysUntil(r.dueDate);
    return d != null && d === 0;
  })) {
    const meta = REMINDER_META[r.type] ?? REMINDER_META.custom;
    const title = r.type === 'vaccination' ? canonicalizeReminderTitle(r.title) : r.title;
    items.push({
      id: `rem-${r.id}`,
      icon: meta.icon as any,
      tint: colors.warning,
      title,
      detail: 'Due today',
      weight: 100,
      reminder: r,
      isVaccine: r.type === 'vaccination',
    });
  }

  // Insights (only the warn/danger ones)
  const insights = generateInsights(pet, entries);
  for (const i of insights) {
    if (i.tone !== 'warning' && i.tone !== 'danger') continue;
    items.push({
      id: `insight-${i.id}`,
      icon: i.icon as any,
      tint: i.tone === 'danger' ? colors.danger : colors.warning,
      title: i.title,
      detail: i.body,
      weight: i.tone === 'danger' ? 50 : 200,
    });
  }

  items.sort((a, b) => a.weight - b.weight);
  return items;
}

interface Props {
  pet: Pet;
  items: NeedsItem[];
  onMarkDone?: (reminder: Reminder) => void;
  onItemPress?: (item: NeedsItem) => void;
  /** Tapped when the "View all N items" link in the expanded tree is pressed. */
  onViewAll?: () => void;
}

const EXPANDED_PREVIEW_LIMIT = 3;

export function PetNeedsCard({ pet, items, onMarkDone, onItemPress, onViewAll }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Smart summary: top 2 item titles + "+N more" if more.
  const summary = useMemo(() => {
    if (items.length === 0) return '';
    const top = items.slice(0, 2).map(i => shortLabel(i));
    if (items.length > 2) top.push(`+${items.length - 2} more`);
    return top.join(' · ');
  }, [items]);

  const hasDanger = items.some(i => i.tint === colors.danger);

  return (
    <Pressable
      onPress={() => setExpanded(prev => !prev)}
      style={({ pressed }) => [
        styles.card,
        hasDanger && styles.cardDanger,
        pressed && { opacity: 0.95 },
      ]}
    >
      <View style={styles.header}>
        <PetAvatar pet={pet} size={48} />
        <View style={styles.headerBody}>
          <Text style={styles.name} numberOfLines={1}>
            {pet.name} needs attention
          </Text>
          <Text style={styles.summary} numberOfLines={2}>
            {summary}
          </Text>
        </View>
        <View style={[styles.countBubble, hasDanger && { backgroundColor: colors.danger }]}>
          <Text style={styles.countText}>{items.length}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textFaint}
          style={{ marginLeft: 4 }}
        />
      </View>

      {expanded ? (
        <View style={styles.tree}>
          {/* Cap the expanded preview so Home doesn't turn into a long
              reminders list when one pet has many issues. */}
          {items.slice(0, EXPANDED_PREVIEW_LIMIT).map((item, idx) => (
            <View key={item.id} style={[styles.itemRow, idx === 0 && styles.itemRowFirst]}>
              <View style={[styles.itemIcon, { backgroundColor: item.tint + '22' }]}>
                <Ionicons name={item.icon} size={16} color={item.tint} />
              </View>
              <Pressable
                onPress={() => onItemPress?.(item)}
                disabled={!onItemPress}
                style={{ flex: 1 }}
              >
                <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.itemDetail} numberOfLines={2}>{item.detail}</Text>
              </Pressable>
              {/* Vaccine reminders are informational — no green check.
                  Daily-task reminders get a Mark Done button. */}
              {item.reminder && !item.isVaccine && onMarkDone ? (
                <Pressable
                  onPress={() => onMarkDone(item.reminder!)}
                  style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.85 }]}
                  hitSlop={8}
                >
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </Pressable>
              ) : item.reminder ? (
                <Ionicons name="chevron-forward" size={14} color={colors.textFaint} style={{ marginLeft: 4 }} />
              ) : null}
            </View>
          ))}

          {items.length > EXPANDED_PREVIEW_LIMIT ? (
            <Pressable
              onPress={onViewAll}
              style={({ pressed }) => [styles.viewAllRow, pressed && { opacity: 0.85 }]}
              hitSlop={4}
            >
              <Text style={styles.viewAllText}>
                View all {items.length} issues
              </Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function shortLabel(item: NeedsItem): string {
  // Trim the detail to keep summary line tight.
  if (item.reminder) {
    if (item.isVaccine) return `${item.title} expired`;
    if (item.detail.toLowerCase().startsWith('overdue')) return `${item.title} overdue`;
    if (item.detail === 'Due today') return `${item.title} due today`;
    return item.title;
  }
  return item.title;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.base,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  cardDanger: { borderLeftColor: colors.danger },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerBody: { flex: 1, gap: 3 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  summary: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  countBubble: {
    minWidth: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.warning,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  tree: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  itemRowFirst: { borderTopWidth: 0 },
  itemIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  itemDetail: { fontSize: 12, color: colors.textMuted, marginTop: 1, lineHeight: 16 },
  doneBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.success + 'CC',
    alignItems: 'center', justifyContent: 'center',
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  viewAllText: { fontSize: 13, fontWeight: '600', color: colors.primary },
});
