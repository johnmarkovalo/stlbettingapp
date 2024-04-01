import React, {useState, useEffect, useContext} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Text,
  Button,
} from 'react-native';
import Ionic from 'react-native-vector-icons/Ionicons';
import Colors from '../Styles/Colors';
import DropDownPicker from 'react-native-dropdown-picker';

const widthScreen = Dimensions.get('window').width;
const heightScreen = Dimensions.get('window').height;

const TypeModal = ({setType, type, hide}: any) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([
    {label: 'S3', value: 1},
    {label: 'STL', value: 2},
  ]);
  function hideModal() {
    hide();
  }

  return (
    <View style={styles.centeredView}>
      <View style={styles.modalView}>
        {/* Header */}
        <View style={styles.modalHeaderContainer}>
          <Text style={styles.modalTitle}>{'Select Type'}</Text>
          <TouchableOpacity
            onPress={hide}
            style={{
              padding: 10,
              alignSelf: 'flex-end',
              position: 'absolute',
            }}>
            <Ionic
              name="close"
              size={30}
              style={{
                color: '#000',
              }}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.modalBodyContainer}>
          <DropDownPicker
            open={open}
            value={type}
            items={items}
            setOpen={setOpen}
            setValue={setType}
            setItems={setItems}
            onSelectItem={hideModal}
            // disabled={isPending}
            style={{width: widthScreen / 1.5}}
            dropDownContainerStyle={{width: widthScreen / 1.5, zIndex: 1000}}
            // autoScroll={true}
            // scrollViewProps={}
          />
        </View>
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
    // marginTop: 22,
    width: widthScreen,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalView: {
    // margin: 15,
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
    height: heightScreen * 0.2,
    width: widthScreen * 0.9,
  },
  modalHeaderContainer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: widthScreen * 0.9,
    padding: 10,
    alignSelf: 'center',
  },
  modalBodyContainer: {
    flex: 1,
    padding: 1,
  },
  modalTitle: {
    alignSelf: 'center',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Black,
  },
});

export default TypeModal;
