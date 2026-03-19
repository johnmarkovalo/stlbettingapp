import {palette, colors as themeColors} from '../theme/colors';

/**
 * Legacy color map - bridges old references to new design system.
 * New code should import from '../theme' directly.
 */
const colors = {
  // Mapped to new theme
  primaryColor: palette.primary[500],
  Black: palette.black,
  White: palette.white,
  textColor: palette.gray[800],
  backgroundLight: palette.gray[50],
  lightGrey: palette.gray[100],
  grey: palette.gray[50],
  darkGrey: palette.gray[500],
  mediumGrey: palette.gray[300],
  darkBlue: palette.primary[900],
  textBlack: palette.gray[900],
  cadietBlue: palette.gray[400],
  mediumBlue: palette.primary[600],
  mediumRed: palette.warning[500],
  mediumGreen: palette.success[500],
  mediumYellow: palette.secondary[500],
  red: palette.danger[500],
  green: palette.success[600],
  teal: palette.accent[500],
};

export default colors;
