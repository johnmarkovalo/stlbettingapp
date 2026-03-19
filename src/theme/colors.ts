/**
 * Design System Colors
 * Matches stlbetting admin portal palette (blue/gold theme)
 */

export const palette = {
  // Primary - Deep Blue
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#2563EB',
    600: '#1D4ED8',
    700: '#1E40AF',
    800: '#1E3A8A',
    900: '#172554',
  },

  // Secondary - Amber/Gold
  secondary: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  // Accent - Teal
  accent: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488',
    700: '#0F766E',
    800: '#115E59',
    900: '#134E4A',
  },

  // Semantic - Success (Emerald)
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },

  // Semantic - Warning (Orange)
  warning: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },

  // Semantic - Danger (Rose)
  danger: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    200: '#FECDD3',
    300: '#FDA4AF',
    400: '#FB7185',
    500: '#F43F5E',
    600: '#E11D48',
    700: '#BE123C',
    800: '#9F1239',
    900: '#881337',
  },

  // Neutral - Gray
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Base
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

/**
 * Semantic color aliases for common use cases
 */
export const colors = {
  // Backgrounds
  background: palette.white,
  backgroundSecondary: palette.gray[50],
  backgroundTertiary: palette.gray[100],
  card: palette.white,
  backdrop: 'rgba(0, 0, 0, 0.5)',

  // Text
  text: palette.gray[900],
  textSecondary: palette.gray[600],
  textTertiary: palette.gray[400],
  textInverse: palette.white,
  textLink: palette.primary[500],

  // Borders
  border: palette.gray[200],
  borderFocused: palette.primary[500],
  borderError: palette.danger[500],
  divider: palette.gray[200],

  // Interactive
  buttonPrimary: palette.primary[500],
  buttonPrimaryPressed: palette.primary[600],
  buttonSecondary: palette.secondary[500],
  buttonDanger: palette.danger[500],

  // Tab bar
  tabActive: palette.primary[500],
  tabInactive: palette.gray[400],

  // Status
  statusSynced: palette.success[500],
  statusPrinted: palette.warning[500],
  statusPending: palette.gray[400],

  // Brand
  primary: palette.primary[500],
  secondary: palette.secondary[500],
  accent: palette.accent[500],
};

export default colors;
