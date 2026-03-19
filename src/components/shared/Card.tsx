import React from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import {palette} from '../../theme/colors';
import {borderRadius, spacing} from '../../theme/spacing';
import {shadows} from '../../theme/shadows';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({
  children,
  style,
  padded = true,
  shadow = 'md',
}) => {
  return (
    <View
      style={[
        styles.card,
        padded ? styles.padded : undefined,
        shadows[shadow],
        style,
      ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: palette.gray[200],
  },
  padded: {
    padding: spacing[4],
  },
});

export default React.memo(Card);
