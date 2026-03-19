import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {palette} from '../../theme/colors';
import {fontFamily, fontSize} from '../../theme/typography';
import {borderRadius, spacing} from '../../theme/spacing';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantColors: Record<BadgeVariant, {bg: string; text: string}> = {
  success: {bg: palette.success[100], text: palette.success[700]},
  warning: {bg: palette.warning[100], text: palette.warning[700]},
  danger: {bg: palette.danger[100], text: palette.danger[700]},
  info: {bg: palette.primary[100], text: palette.primary[700]},
  default: {bg: palette.gray[100], text: palette.gray[700]},
};

const Badge: React.FC<BadgeProps> = ({label, variant = 'default'}) => {
  const v = variantColors[variant];
  return (
    <View style={[styles.badge, {backgroundColor: v.bg}]}>
      <Text style={[styles.text, {color: v.text}]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
  },
});

export default React.memo(Badge);
