import type { Ionicons } from '@expo/vector-icons';
import type { ReceiptCategory } from '@/types/models';

// Single source of truth for receipt-category labels, icons, and tints.
// Used by the scanner, the spending list, and the category picker.

export interface ReceiptCategoryConfig {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
}

const TINT = {
  amber: '#f59e0b',
  teal: '#2a8fa8',
  blue: '#5ea3c4',
  purple: '#9b7bbf',
  green: '#3fa68c',
  red: '#d54545',
  orange: '#ff8a4c',
  pink: '#e07a99',
  slate: '#6b7480',
} as const;

export const RECEIPT_CATEGORY_META: Record<ReceiptCategory, ReceiptCategoryConfig> = {
  food: { label: 'Food', icon: 'restaurant-outline', tint: TINT.amber },
  treats: { label: 'Treats', icon: 'nutrition-outline', tint: TINT.orange },
  grooming: { label: 'Grooming', icon: 'cut-outline', tint: TINT.blue },
  toys: { label: 'Toys', icon: 'tennisball-outline', tint: TINT.green },
  supplies: { label: 'Supplies', icon: 'bag-handle-outline', tint: TINT.teal },
  medical: { label: 'Medical', icon: 'medkit-outline', tint: TINT.red },
  boarding: { label: 'Boarding', icon: 'home-outline', tint: TINT.purple },
  training: { label: 'Training', icon: 'school-outline', tint: TINT.pink },
  insurance: { label: 'Insurance', icon: 'shield-checkmark-outline', tint: TINT.slate },
  other: { label: 'Other', icon: 'pricetag-outline', tint: TINT.slate },
};

export const RECEIPT_CATEGORIES: ReceiptCategory[] = [
  'food', 'treats', 'grooming', 'toys', 'supplies',
  'medical', 'boarding', 'training', 'insurance', 'other',
];

/** Coerce an arbitrary string (e.g. OCR guess) into a valid ReceiptCategory. */
export function normalizeReceiptCategory(value: string | null | undefined): ReceiptCategory {
  if (!value) return 'other';
  const v = value.trim().toLowerCase();
  if ((RECEIPT_CATEGORIES as string[]).includes(v)) return v as ReceiptCategory;
  // A few friendly aliases the model might emit.
  if (v === 'food & treats' || v === 'pet food') return 'food';
  if (v === 'vet' || v === 'medication' || v === 'pharmacy' || v === 'health') return 'medical';
  if (v === 'daycare' || v === 'sitting') return 'boarding';
  if (v === 'accessories' || v === 'apparel' || v === 'equipment') return 'supplies';
  return 'other';
}

export function receiptCategoryLabel(category: ReceiptCategory): string {
  return RECEIPT_CATEGORY_META[category].label;
}

/**
 * Parse a printed money string ("$42.99", "USD 42.99", "42,99") into a
 * number of dollars. Returns null when nothing numeric is present.
 */
export function parseAmount(text: string | null | undefined): number | null {
  if (!text) return null;
  // Keep digits, dot, comma, minus. Treat comma as thousands sep if a dot
  // exists, otherwise as a decimal separator (European style).
  let cleaned = text.replace(/[^0-9.,-]/g, '');
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/,/g, '');
  } else if (cleaned.includes(',') && !cleaned.includes('.')) {
    cleaned = cleaned.replace(',', '.');
  }
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Format a dollar number as "$42.99". Falls back to a dash for null. */
export function formatAmount(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return '—';
  return `$${amount.toFixed(2)}`;
}
