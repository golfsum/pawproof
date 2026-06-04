// Weight: storage is always kilograms (canonical). UI converts to lb for
// display when the user prefers imperial. Default preference is `lb`.
//
// Distance: storage is always meters (canonical). UI converts to mi or km
// based on `userProfile.distanceUnit`. Default depends on the device locale
// (US = mi, everyone else = km) until the user picks a preference.

export type WeightUnit = 'lb' | 'kg';
export type DistanceUnit = 'mi' | 'km';

export const KG_PER_LB = 0.45359237;

export const METERS_PER_MILE = 1609.344;
export const METERS_PER_KM = 1000;

export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

export function metersToKm(meters: number): number {
  return meters / METERS_PER_KM;
}

export function milesToMeters(mi: number): number {
  return mi * METERS_PER_MILE;
}

export function kmToMeters(km: number): number {
  return km * METERS_PER_KM;
}

export function convertDistance(value: number, from: DistanceUnit, to: DistanceUnit): number {
  if (from === to) return value;
  return from === 'mi' ? value * (METERS_PER_MILE / METERS_PER_KM) : value * (METERS_PER_KM / METERS_PER_MILE);
}

/**
 * Format a distance stored in meters for display in the user's unit.
 * Shows one decimal under 10, no decimals at or above. Returns an empty
 * string for null/undefined so callers can fall through to a duration
 * label.
 */
export function fmtDistance(distanceMeters: number | null | undefined, unit: DistanceUnit = 'mi'): string {
  if (distanceMeters == null || Number.isNaN(distanceMeters)) return '';
  const value = unit === 'mi' ? metersToMiles(distanceMeters) : metersToKm(distanceMeters);
  const display = value >= 10 ? value.toFixed(0) : value.toFixed(1).replace(/\.0$/, '');
  return `${display} ${unit}`;
}

/**
 * Returns the device's preferred distance unit when the user hasn't
 * explicitly picked one. Only en-US (and a couple of other holdouts)
 * default to miles; everywhere else defaults to kilometers. The user
 * can override in Settings → Units.
 */
export function defaultDistanceUnitForLocale(): DistanceUnit {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? 'en-US';
    if (/^en-(us|lr)$/i.test(locale)) return 'mi';
    if (/^my-mm$/i.test(locale)) return 'mi';
    return 'km';
  } catch {
    return 'mi';
  }
}

/** Resolve a stored preference into an effective unit, falling back to locale. */
export function resolveDistanceUnit(stored: DistanceUnit | null | undefined): DistanceUnit {
  return stored ?? defaultDistanceUnitForLocale();
}

// Date order ('mdy' US, 'dmy' European). US is the main mdy locale; most of
// the world is dmy. Used as the default until the user picks in Settings.
export type DateFormatPref = 'mdy' | 'dmy';
export function defaultDateFormatForLocale(): DateFormatPref {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? 'en-US';
    return /^en-us$/i.test(locale) ? 'mdy' : 'dmy';
  } catch {
    return 'mdy';
  }
}
export function resolveDateFormat(stored: DateFormatPref | null | undefined): DateFormatPref {
  return stored ?? defaultDateFormatForLocale();
}

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
  if (weightKg == null || Number.isNaN(weightKg)) return '-';
  const value = unit === 'lb' ? kgToLb(weightKg) : weightKg;
  // Trim trailing .0 so `12.0 lb` doesn't read worse than `12 lb`.
  const display = value >= 100 ? value.toFixed(0) : value.toFixed(1).replace(/\.0$/, '');
  return `${display} ${unit}`;
}

/** Format weight for compact display (e.g. inside a card). Same as fmtWeight but no '-' fallback. */
export function fmtWeightShort(weightKg: number | null | undefined, unit: WeightUnit = 'lb'): string {
  if (weightKg == null || Number.isNaN(weightKg)) return '';
  return fmtWeight(weightKg, unit);
}
