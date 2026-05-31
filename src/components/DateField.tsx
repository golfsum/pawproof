import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import { fmtDate, fmtRelative } from '@/utils/dates';

interface Props {
  /** Optional field label shown above the button. Omit when the caller
   *  renders its own label (e.g. inside a <Field> wrapper). */
  label?: string;
  value: Date | null;
  onChange: (d: Date | null) => void;
  mode?: 'date' | 'datetime';
  optional?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  /** Text shown on the button when no date is selected. */
  placeholder?: string;
}

export function DateField({ label, value, onChange, mode = 'date', optional, minimumDate, maximumDate, placeholder = 'Pick a date' }: Props) {
  const [showing, setShowing] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(value ?? new Date());

  const open = () => {
    setTempDate(value ?? new Date());
    setShowing(true);
  };

  const handleChange = (_: unknown, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowing(false);
      if (selected) onChange(selected);
      return;
    }
    if (selected) setTempDate(selected);
  };

  return (
    <View style={styles.wrap}>
      {label || optional ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {optional && value ? (
            <Pressable hitSlop={8} onPress={() => onChange(null)}>
              <Text style={styles.clear}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <Pressable onPress={open} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}>
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text style={[styles.value, !value && { color: colors.textFaint }]}>
          {value ? (mode === 'datetime' ? fmtRelative(value) : fmtDate(value)) : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textFaint} />
      </Pressable>

      {Platform.OS === 'ios' ? (
        <Modal transparent visible={showing} animationType="slide" onRequestClose={() => setShowing(false)}>
          <Pressable style={styles.backdrop} onPress={() => setShowing(false)} />
          <View style={styles.iosSheet}>
            <View style={styles.iosHeader}>
              <Pressable onPress={() => setShowing(false)} hitSlop={8}>
                <Text style={styles.cancel}>Cancel</Text>
              </Pressable>
              <Text style={styles.iosTitle}>{label ?? 'Pick a date'}</Text>
              <Pressable onPress={() => { onChange(tempDate); setShowing(false); }} hitSlop={8}>
                <Text style={styles.done}>Done</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={tempDate}
              mode={mode}
              display="spinner"
              onChange={handleChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              themeVariant="light"
            />
          </View>
        </Modal>
      ) : (
        showing && (
          <DateTimePicker
            value={tempDate}
            mode={mode}
            onChange={handleChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginLeft: 4 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  clear: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  value: { flex: 1, fontSize: 15, color: colors.text },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)' },
  iosSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.lg,
  },
  iosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  iosTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  cancel: { fontSize: 15, color: colors.textMuted },
  done: { fontSize: 15, color: colors.primary, fontWeight: '600' },
});
