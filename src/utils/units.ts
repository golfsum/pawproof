// Weight: storage is always kilograms (canonical). UI converts to lb for
// display when the user prefers imperial. Default preference is `lb`.

export type WeightUnit = 'lb' | 'kg';

export const KG_PER_LB = 0.45359237;

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

/**
 * Format a weight stored in kg for display in the user's preferred unit.
 * One decimal place; returns the em-dash for null.
 */
export function fmtWeight(weightKg: number | null | undefined, unit: WeightUnit = 'lb'): string {
  if (weightKg == null || Number.isNaN(weightKg)) return '—';
  const value = unit === 'lb' ? kgToLb(weightKg) : weightKg;
  // Trim trailing .0 — `12.0 lb` reads worse than `12 lb`.
  const display = value >= 100 ? value.toFixed(0) : value.toFixed(1).replace(/\.0$/, '');
  return `${display} ${unit}`;
}

/** Format weight for compact display (e.g. inside a card). Same as fmtWeight but no '—' fallback. */
export function fmtWeightShort(weightKg: number | null | undefined, unit: WeightUnit = 'lb'): string {
  if (weightKg == null || Number.isNaN(weightKg)) return '';
  return fmtWeight(weightKg, unit);
}
