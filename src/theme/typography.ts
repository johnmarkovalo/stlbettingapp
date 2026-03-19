/**
 * Design System Typography
 */

export const fontFamily = {
  regular: 'Nunito-Regular',
  medium: 'Nunito-Medium',
  semiBold: 'Nunito-SemiBold',
  bold: 'Nunito-Bold',
  extraBold: 'Nunito-ExtraBold',
  black: 'Nunito-Black',
  light: 'Nunito-Light',
};

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
};

export const lineHeight = {
  xs: 16,
  sm: 18,
  base: 22,
  md: 24,
  lg: 26,
  xl: 28,
  '2xl': 32,
  '3xl': 36,
  '4xl': 40,
};

/**
 * Pre-composed text styles
 */
export const textStyles = {
  // Headings
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    lineHeight: lineHeight['3xl'],
  },
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight['2xl'],
  },
  h3: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
  },
  h4: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
  },

  // Body
  bodyLarge: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
  },
  bodySmall: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },

  // Labels
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },
  labelSmall: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
  },

  // Buttons
  button: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
  },
  buttonSmall: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },

  // Special
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
  },
  overline: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
};

export default textStyles;
