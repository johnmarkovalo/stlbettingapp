import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {palette} from '../../theme/colors';
import {fontFamily, fontSize} from '../../theme/typography';
import {spacing} from '../../theme/spacing';
import Icon, {IconName} from './Icon';

interface HeaderProps {
  title: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  onLeftPress?: () => void;
  onRightPress?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  title,
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.side}>
        {leftIcon && onLeftPress && (
          <TouchableOpacity onPress={onLeftPress} style={styles.iconButton}>
            <Icon name={leftIcon} size={24} color={palette.gray[700]} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.side}>
        {rightIcon && onRightPress && (
          <TouchableOpacity onPress={onRightPress} style={styles.iconButton}>
            <Icon name={rightIcon} size={24} color={palette.gray[700]} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: palette.white,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray[200],
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    color: palette.gray[900],
    flex: 1,
    textAlign: 'center',
  },
  side: {
    width: 40,
    alignItems: 'center',
  },
  iconButton: {
    padding: spacing[1],
  },
});

export default React.memo(Header);
