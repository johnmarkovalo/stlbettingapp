import React from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import {palette} from '../../theme/colors';
import {spacing} from '../../theme/spacing';

interface DividerProps {
  style?: ViewStyle;
  vertical?: boolean;
  color?: string;
}

const Divider: React.FC<DividerProps> = ({
  style,
  vertical = false,
  color = palette.gray[200],
}) => {
  return (
    <View
      style={[
        vertical ? styles.vertical : styles.horizontal,
        {backgroundColor: color},
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  horizontal: {
    height: 1,
    width: '100%',
    marginVertical: spacing[2],
  },
  vertical: {
    width: 1,
    height: '100%',
    marginHorizontal: spacing[2],
  },
});

export default React.memo(Divider);
