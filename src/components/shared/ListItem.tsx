import React from 'react';
import {TouchableOpacity, View, Text, StyleSheet} from 'react-native';
import {palette} from '../../theme/colors';
import {fontFamily, fontSize} from '../../theme/typography';
import {spacing, borderRadius} from '../../theme/spacing';
import Icon, {IconName} from './Icon';

interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: string;
  onPress?: () => void;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
}

const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  icon,
  iconColor = palette.primary[500],
  onPress,
  showChevron = true,
  rightElement,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.6}
      style={styles.container}>
      {icon && (
        <View style={[styles.iconContainer, {backgroundColor: iconColor + '15'}]}>
          <Icon name={icon} size={22} color={iconColor} weight="bold" />
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {rightElement}
      {showChevron && onPress && (
        <Icon name="CaretRight" size={18} color={palette.gray[400]} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: palette.gray[900],
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: palette.gray[500],
    marginTop: 2,
  },
});

export default React.memo(ListItem);
