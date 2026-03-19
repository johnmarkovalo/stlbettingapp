import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Text,
} from 'react-native';
import {palette} from '../../theme/colors';
import {fontFamily, fontSize} from '../../theme/typography';
import {borderRadius, spacing} from '../../theme/spacing';
import {shadows} from '../../theme/shadows';
import Icon from './Icon';

const widthScreen = Dimensions.get('window').width;
const heightScreen = Dimensions.get('window').height;

interface BaseModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  height?: number;
  showCloseButton?: boolean;
}

const BaseModal: React.FC<BaseModalProps> = ({
  title,
  onClose,
  children,
  height = 0.6,
  showCloseButton = true,
}) => {
  return (
    <View style={styles.centeredView}>
      <View style={[styles.modalView, {height: heightScreen * height}]}>
        {/* Header */}
        <View style={styles.modalHeaderContainer}>
          <Text style={styles.modalTitle}>{title}</Text>
          {showCloseButton && (
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Close modal"
              accessibilityRole="button">
              <Icon name="X" size={24} color={palette.gray[600]} weight="bold" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.divider} />
        {/* Content */}
        <View style={styles.modalBodyContainer}>{children}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    width: widthScreen,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    backgroundColor: palette.white,
    borderRadius: borderRadius['2xl'],
    padding: spacing[1],
    alignItems: 'center',
    width: widthScreen * 0.9,
    ...shadows.lg,
  },
  modalHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    position: 'relative',
  },
  divider: {
    height: 1,
    width: '90%',
    backgroundColor: palette.gray[200],
  },
  modalBodyContainer: {
    flex: 1,
    padding: spacing[5],
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: palette.gray[900],
    textAlign: 'center',
  },
  closeButton: {
    padding: spacing[2],
    position: 'absolute',
    right: spacing[2],
    top: spacing[2],
  },
});

export default BaseModal;
