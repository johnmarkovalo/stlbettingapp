import React, {useCallback} from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {palette} from '../../theme/colors';
import {fontFamily, fontSize} from '../../theme/typography';
import {borderRadius, spacing} from '../../theme/spacing';
import {shadows} from '../../theme/shadows';
import Icon, {IconName} from './Icon';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, {bg: string; text: string; border?: string}> = {
  primary: {bg: palette.primary[500], text: palette.white},
  secondary: {bg: palette.secondary[500], text: palette.white},
  danger: {bg: palette.danger[500], text: palette.white},
  outline: {bg: 'transparent', text: palette.primary[500], border: palette.primary[500]},
  ghost: {bg: 'transparent', text: palette.primary[500]},
};

const sizeStyles: Record<ButtonSize, {height: number; px: number; fontSize: number; iconSize: number}> = {
  sm: {height: 36, px: spacing[3], fontSize: fontSize.sm, iconSize: 16},
  md: {height: 44, px: spacing[4], fontSize: fontSize.base, iconSize: 20},
  lg: {height: 52, px: spacing[5], fontSize: fontSize.md, iconSize: 22},
};

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;

  const handlePress = useCallback(() => {
    if (!isDisabled) {
      onPress();
    }
  }, [isDisabled, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.px,
          backgroundColor: v.bg,
        },
        v.border ? {borderWidth: 1.5, borderColor: v.border} : undefined,
        fullWidth ? styles.fullWidth : undefined,
        isDisabled ? styles.disabled : undefined,
        variant === 'primary' || variant === 'secondary' || variant === 'danger'
          ? shadows.sm
          : undefined,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={v.text}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Icon name={icon} size={s.iconSize} color={v.text} weight="bold" />
          )}
          <Text
            style={[
              styles.text,
              {color: v.text, fontSize: s.fontSize},
              icon ? {marginLeft: iconPosition === 'left' ? spacing[2] : 0, marginRight: iconPosition === 'right' ? spacing[2] : 0} : undefined,
              textStyle,
            ]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Icon name={icon} size={s.iconSize} color={v.text} weight="bold" />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
  },
  text: {
    fontFamily: fontFamily.bold,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default React.memo(Button);
