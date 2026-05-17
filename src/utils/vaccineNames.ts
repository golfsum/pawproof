// Canonical vaccine name normalization.
//
// Vet docs are inconsistent: one clinic writes "Parvo Annual", another
// "DA2PP", another "5-in-1". They're all the same combination dog vaccine
// (DHPP). This module maps any common alias to its canonical short form
// (used for display) and to a canonical key (used for dedup matching).

/**
 * Map of lowercase alias → canonical key. The canonical key is also
 * lowercase. Aliases include common single-component names that are usually
 * administered as part of a combination vaccine (e.g. "parvo" → "dhpp").
 *
 * Add new clinic-specific names here without changing call sites.
 */
const VACCINE_ALIASES: Record<string, string> = {
  // DHPP family: the dog combo (Distemper, Adenovirus/Hepatitis, Parainfluenza, Parvo)
  'dhpp': 'dhpp',
  'da2pp': 'dhpp',
  'dapp': 'dhpp',
  'dap': 'dhpp',
  'dhppi': 'dhpp',
  'dappi': 'dhpp',
  'da2p-p': 'dhpp',
  'da2p p': 'dhpp',
  'dhlpp': 'dhpp',           // DHPP + Lepto, treat as DHPP for matching
  'parvo': 'dhpp',
  'parvovirus': 'dhpp',
  'cpv': 'dhpp',
  'distemper': 'dhpp',
  'cdv': 'dhpp',
  'adenovirus': 'dhpp',
  'hepatitis': 'dhpp',
  'parainfluenza': 'dhpp',
  '5-in-1': 'dhpp',
  '5 in 1': 'dhpp',
  '5 way': 'dhpp',
  '5-way': 'dhpp',
  'five way': 'dhpp',
  'five-way': 'dhpp',
  'distemper combo': 'dhpp',
  'puppy combo': 'dhpp',

  // FVRCP family: the cat combo (Rhinotracheitis, Calici, Panleukopenia)
  'fvrcp': 'fvrcp',
  'feline distemper': 'fvrcp',
  'feline combo': 'fvrcp',
  'rhino': 'fvrcp',
  'rhinotracheitis': 'fvrcp',
  'calici': 'fvrcp',
  'calicivirus': 'fvrcp',
  'panleukopenia': 'fvrcp',
  'panleuk': 'fvrcp',
  'hcp': 'fvrcp',
  'rcp': 'fvrcp',

  // Rabies (with common misspellings)
  'rabies': 'rabies',
  'rabbies': 'rabies',
  'rabis': 'rabies',
  'rab': 'rabies',

  // Bordetella
  'bordetella': 'bordetella',
  'bord': 'bordetella',
  'kennel cough': 'bordetella',
  'b. bronchiseptica': 'bordetella',

  // Leptospirosis
  'lepto': 'lepto',
  'leptospirosis': 'lepto',
  'lepto 4-way': 'lepto',
  'lepto4': 'lepto',

  // Lyme
  'lyme': 'lyme',
  'borrelia': 'lyme',
  'borreliosis': 'lyme',

  // Canine Influenza
  'influenza': 'influenza',
  'flu': 'influenza',
  'canine flu': 'influenza',
  'civ': 'influenza',
  'h3n2': 'influenza',
  'h3n8': 'influenza',
  'bivalent flu': 'influenza',

  // FeLV (Feline Leukemia)
  'felv': 'felv',
  'feline leukemia': 'felv',
  'leukemia': 'felv',

  // FIV
  'fiv': 'fiv',
  'feline immunodeficiency': 'fiv',

  // Heartworm test (and 4DX which adds tick-borne pathogens)
  'heartworm test': 'heartworm test',
  'heartworm': 'heartworm test',
  'hw test': 'heartworm test',
  'hw': 'heartworm test',
  '4dx': 'heartworm test',
  'snap 4dx': 'heartworm test',
  'snap test': 'heartworm test',
  'accuplex': 'heartworm test',

  // Fecal exam
  'fecal': 'fecal',
  'fecal exam': 'fecal',
  'fecal test': 'fecal',
  'ova & parasites': 'fecal',
  'o&p': 'fecal',

  // Rattlesnake
  'rattlesnake': 'rattlesnake',
  'crotalus': 'rattlesnake',
};

/** Canonical key → display name. */
const CANONICAL_DISPLAY: Record<string, string> = {
  'dhpp': 'DHPP',
  'fvrcp': 'FVRCP',
  'rabies': 'Rabies',
  'bordetella': 'Bordetella',
  'lepto': 'Lepto',
  'lyme': 'Lyme',
  'influenza': 'Influenza',
  'felv': 'FeLV',
  'fiv': 'FIV',
  'heartworm test': 'Heartworm Test',
  'fecal': 'Fecal',
  'rattlesnake': 'Rattlesnake',
};

/** Strip common qualifiers that don't change identity (annual, 1-year, etc.). */
function stripQualifiers(s: string): string {
  return s
    .replace(/\b(annual|yearly|booster|adult|puppy|kitten|adultvax)\b/gi, '')
    .replace(/\b\d+[\s-]?(year|yr|month|mo)s?\b/gi, '')
    .replace(/\bvaccine\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Map any vaccine name to its canonical key (lowercase, for dedup matching).
 * Unknown names fall through with a lowercase trimmed/stripped form.
 */
export function vaccineKey(name: string): string {
  const cleaned = stripQualifiers(name.trim().toLowerCase());
  if (!cleaned) return '';

  if (VACCINE_ALIASES[cleaned]) return VACCINE_ALIASES[cleaned];

  // Substring match: handles "Parvo Mono", "Bordetella Oral", etc.
  for (const [alias, canonical] of Object.entries(VACCINE_ALIASES)) {
    if (alias.length < 3) continue; // avoid matching against very short keys
    const pattern = new RegExp(`\\b${escapeRegex(alias)}\\b`);
    if (pattern.test(cleaned)) return canonical;
  }

  return cleaned;
}

/**
 * Map any vaccine name to its preferred display form ("DHPP", "Bordetella").
 * Unknown names are returned with their original casing (just trimmed).
 */
export function canonicalizeVaccineName(name: string): string {
  const key = vaccineKey(name);
  if (CANONICAL_DISPLAY[key]) return CANONICAL_DISPLAY[key];
  return name.trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
}

/**
 * Reminder titles look like "Rabies vaccine", "Rabies renewal", or
 * "Rabies vaccine expires soon". Canonicalize the vaccine-name portion in
 * place so historical typos like "Rabbies vaccine" render as "Rabies
 * vaccine" without rewriting Firestore.
 */
export function canonicalizeReminderTitle(title: string): string {
  const m = title.match(/^(.+?)\s+(vaccine|renewal)(\s+.+)?$/i);
  if (m) {
    const tail = (m[3] ?? '').trim();
    return `${canonicalizeVaccineName(m[1])} ${m[2].toLowerCase()}${tail ? ' ' + tail : ''}`;
  }
  return canonicalizeVaccineName(title);
}
