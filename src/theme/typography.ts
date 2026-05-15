import { TextStyle } from 'react-native';
import { colors } from './colors';

/**
 * Type system follows the Warm Companion intent: Quicksand for headings
 * (display) and Plus Jakarta Sans for body. Both load via expo-google-fonts.
 * If a font isn't loaded yet, RN falls back to the system font cleanly —
 * splash holds until fonts are ready so this should never be visible.
 */

export const fonts = {
  display: {
    semibold: 'Quicksand_600SemiBold',
    bold: 'Quicksand_700Bold',
  },
  body: {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semibold: 'PlusJakartaSans_600SemiBold',
  },
} as const;

export const typography: Record<string, TextStyle> = {
  display: {
    fontFamily: fonts.display.bold,
    fontSize: 32,
    color: colors.text,
    letterSpacing: -0.5,
  },
  h1: {
    fontFamily: fonts.display.bold,
    fontSize: 26,
    color: colors.text,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: fonts.display.semibold,
    fontSize: 20,
    color: colors.text,
  },
  h3: {
    fontFamily: fonts.display.semibold,
    fontSize: 17,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.body.regular,
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  bodyStrong: {
    fontFamily: fonts.body.semibold,
    fontSize: 15,
    color: colors.text,
  },
  caption: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  captionStrong: {
    fontFamily: fonts.body.semibold,
    fontSize: 13,
    color: colors.textMuted,
  },
  tiny: {
    fontFamily: fonts.body.semibold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
};
