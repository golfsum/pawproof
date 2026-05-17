import type { Pet, Species } from '@/types/models';
import { vaccineKey } from './vaccineNames';

// Default renewal windows by vaccine. Numbers reflect what most US/CA
// vets recommend for adult animals on a stable schedule, with a fallback
// to the more conservative annual interval when we're unsure.
//
// The user can always override the expiration date manually; this just
// provides a sensible default when Smart Scan extracts a "given" date
// without an explicit "next due" date.
//
// Keyed by the canonical vaccine key (see vaccineKey()). Each entry can
// have species-specific schedules; "default" applies when species isn't
// known or doesn't match.

interface ScheduleByAudience {
  // Months until renewal for an adult animal.
  adultMonths: number;
  // Months until renewal for a young animal (puppy/kitten under ~6mo).
  // If undefined, falls back to adultMonths.
  youngMonths?: number;
  // True if the duration depends on whether the manufacturer label
  // marked it as a 1-year or 3-year product. When true we default to
  // the conservative (shorter) duration unless the Gemini extractor
  // says otherwise.
  variable?: boolean;
}

interface VaccineSchedule {
  dog?: ScheduleByAudience;
  cat?: ScheduleByAudience;
  default: ScheduleByAudience;
}

const SCHEDULES: Record<string, VaccineSchedule> = {
  // Rabies: 1yr first dose, 3yr most adult booster jurisdictions allow.
  // Default to 1yr to be safe; the extractor flips to 3yr when the
  // document says so.
  rabies: {
    default: { adultMonths: 12, youngMonths: 12, variable: true },
  },
  // DHPP (dog combo). 1yr first booster, then 3yr is common but many
  // vets stick to annual. Default 12 months.
  dhpp: {
    dog: { adultMonths: 12, youngMonths: 12, variable: true },
    default: { adultMonths: 12 },
  },
  // FVRCP (cat combo). Similar story.
  fvrcp: {
    cat: { adultMonths: 12, youngMonths: 12, variable: true },
    default: { adultMonths: 12 },
  },
  // Bordetella: typically annual, sometimes every 6 months for kennel-
  // boarded dogs. Default annual.
  bordetella: {
    dog: { adultMonths: 12 },
    default: { adultMonths: 12 },
  },
  // Leptospirosis: annual.
  leptospirosis: {
    dog: { adultMonths: 12 },
    default: { adultMonths: 12 },
  },
  // Canine influenza: annual.
  canine_influenza: {
    dog: { adultMonths: 12 },
    default: { adultMonths: 12 },
  },
  // Lyme: annual.
  lyme: {
    dog: { adultMonths: 12 },
    default: { adultMonths: 12 },
  },
  // FeLV (cats): annual for outdoor cats, less frequent for indoor.
  // Default annual.
  felv: {
    cat: { adultMonths: 12 },
    default: { adultMonths: 12 },
  },
};

// Returns months-until-next-due for the named vaccine and pet. Returns
// null when we have no opinion (the caller should leave expiration
// unset rather than guess).
export function getDefaultRenewalMonths(
  vaccineName: string,
  pet?: Pick<Pet, 'species' | 'approxAgeMonths' | 'birthday'>,
): number | null {
  const key = vaccineKey(vaccineName);
  const schedule = SCHEDULES[key];
  if (!schedule) return null;
  const audience: ScheduleByAudience | undefined =
    pet?.species === 'dog'
      ? schedule.dog ?? schedule.default
      : pet?.species === 'cat'
        ? schedule.cat ?? schedule.default
        : schedule.default;
  const months = isYoung(pet) && audience.youngMonths != null
    ? audience.youngMonths
    : audience.adultMonths;
  return months;
}

// Approximate "young" check used by the schedule lookup. Reflects the
// 4–6 month window where puppy/kitten boosters are still primed and
// the booster cadence is shorter (every few weeks). We don't try to
// compute the exact age-in-weeks; the fallback to adult cadence is
// fine.
function isYoung(pet?: Pick<Pet, 'species' | 'approxAgeMonths' | 'birthday'>): boolean {
  if (!pet) return false;
  const months = ageMonths(pet);
  if (months == null) return false;
  if (pet.species === 'dog') return months < 6;
  if (pet.species === 'cat') return months < 6;
  return false;
}

function ageMonths(pet: Pick<Pet, 'approxAgeMonths' | 'birthday'>): number | null {
  if (typeof pet.approxAgeMonths === 'number' && pet.approxAgeMonths >= 0) {
    return pet.approxAgeMonths;
  }
  if (pet.birthday) {
    const d = new Date(pet.birthday);
    if (Number.isNaN(d.getTime())) return null;
    return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
  }
  return null;
}

// Compute the expiration date by adding the default renewal window to
// the given date. Returns null when we don't have a schedule for this
// vaccine.
export function deriveExpiration(
  vaccineName: string,
  dateGivenIso: string,
  pet?: Pick<Pet, 'species' | 'approxAgeMonths' | 'birthday'>,
): string | null {
  const months = getDefaultRenewalMonths(vaccineName, pet);
  if (months == null) return null;
  const d = new Date(dateGivenIso);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + months);
  // Snap to noon UTC so timezone math doesn't shift the date by a day
  // depending on the user's locale.
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}
