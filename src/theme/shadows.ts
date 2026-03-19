import {Platform} from 'react-native';

/**
 * Design System Shadows
 * Cross-platform shadow presets
 */

export const shadows = {
  none: Platform.select({
    ios: {},
    android: {elevation: 0},
  }),

  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: {elevation: 1},
  }),

  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {elevation: 3},
  }),

  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    android: {elevation: 6},
  }),

  xl: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.2,
      shadowRadius: 16,
    },
    android: {elevation: 10},
  }),
};

export default shadows;
