import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Text,
} from 'react-native';
import Ionic from 'react-native-vector-icons/Ionicons';
import Colors from '../../Styles/Colors';

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
              <Ionic name="close" size={30} style={styles.closeIcon} />
            </TouchableOpacity>
          )}
        </View>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: widthScreen * 0.9,
  },
  modalHeaderContainer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: widthScreen * 0.9,
    padding: 10,
    alignSelf: 'center',
    position: 'relative',
  },
  modalBodyContainer: {
    flex: 1,
    padding: 20,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    alignSelf: 'center',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Black,
  },
  closeButton: {
    padding: 10,
    alignSelf: 'flex-end',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  closeIcon: {
    color: '#000',
  },
});

export default BaseModal;
