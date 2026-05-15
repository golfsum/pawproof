// Hybrid palette. Teal as the calm "brand" primary (navigation, buttons,
// records, scan, profile, verified states). Red for urgent / overdue /
// expired / emergency. Amber for "soon / expiring / warning". Cream warm
// background from the Warm Companion intent stays — gives the app its
// approachable feel without making everything feel like an alert.

export const colors = {
  // Surfaces
  bg: '#FDF9F3',
  bgElevated: '#FFFFFF',
  card: '#FFFFFF',
  cardSubtle: '#F7F3ED',
  border: '#E6E2DC',
  divider: '#EBE8E2',

  // Text
  text: '#1F2933',
  textMuted: '#6B7280',
  textFaint: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Primary — Brand Teal. Calm, professional. Used for navigation active
  // state, primary buttons (add/save/scan), records, profile, and any
  // "verified / healthy" UI surface.
  primary: '#2A8FA8',
  primarySoft: '#E1F1F5',
  primaryDark: '#1E6C80',

  // Secondary — Darker brand teal. Reserved for elevated emphasis on the
  // primary brand family (e.g. text on top of `primarySoft` chips, since
  // it has more contrast than `primary` itself).
  secondary: '#1E6C80',
  secondarySoft: '#CFE9EF',
  secondaryDark: '#155663',

  // Accent — Ochre. Tertiary highlight (medication icons, info chips).
  accent: '#835500',
  accentSoft: '#FFE0AC',

  // Warning — Amber. Soft "expiring soon / due today" tone. Eye-catching
  // without reading as an emergency.
  warning: '#B58400',
  warningSoft: '#FEF3C7',

  // Danger — Deep brick red. Used for overdue, expired, emergency, and
  // serious alerts. Distinct from warning so the user can tell at a glance
  // which is urgent vs which is just upcoming.
  danger: '#BA1A1A',
  dangerSoft: '#FFDAD6',

  // Success aliases to primary teal — verified / up-to-date / healthy are
  // all the same brand-positive colour family.
  success: '#2A8FA8',
  successSoft: '#E1F1F5',

  info: '#0EA5E9',
  infoSoft: '#E0F2FE',

  shadow: 'rgba(15, 23, 42, 0.08)',
} as const;

export type ColorKey = keyof typeof colors;
