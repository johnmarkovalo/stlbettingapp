import React, {useState, useCallback} from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import {palette} from '../../theme/colors';
import {fontFamily, fontSize} from '../../theme/typography';
import {borderRadius, spacing} from '../../theme/spacing';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback(
    (e: any) => {
      setIsFocused(true);
      props.onFocus?.(e);
    },
    [props.onFocus],
  );

  const handleBlur = useCallback(
    (e: any) => {
      setIsFocused(false);
      props.onBlur?.(e);
    },
    [props.onBlur],
  );

  return (
    <View style={containerStyle}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        placeholderTextColor={palette.gray[400]}
        {...props}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={[
          styles.input,
          isFocused ? styles.focused : undefined,
          error ? styles.error : undefined,
          style,
        ]}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: palette.gray[700],
    marginBottom: spacing[1],
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: borderRadius.lg,
    borderColor: palette.gray[300],
    paddingHorizontal: spacing[4],
    backgroundColor: palette.white,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: palette.gray[900],
  },
  focused: {
    borderColor: palette.primary[500],
    borderWidth: 2,
  },
  error: {
    borderColor: palette.danger[500],
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: palette.danger[500],
    marginTop: spacing[1],
  },
});

export default React.memo(Input);
