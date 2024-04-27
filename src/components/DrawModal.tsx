import React, {useState, useEffect, useContext} from 'react';
import {useSelector,useDispatch} from 'react-redux';
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
import { typesActions } from "../store/actions";

const widthScreen = Dimensions.get('window').width;
const heightScreen = Dimensions.get('window').height;

const DrawModal = ({hide}: any) => {
  const dispatch = useDispatch();
  const [value, setValue] = useState(useSelector(state => state.types.selectedDraw));
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([
    {label: '1st Draw', value: 1},
    {label: '2nd Draw', value: 2},
    {label: '3rd Draw', value: 3},
  ]);
  function hideModal() {
    hide();
  }
  return (
    <View style={styles.centeredView}>
      <View style={styles.modalView}>
        {/* Header */}
        <View style={styles.modalHeaderContainer}>
          <Text style={styles.modalTitle}>{'Select Draw'}</Text>
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
            value={value}
            items={items}
            setOpen={setOpen}
            setValue={setValue}
            setItems={setItems}
            onSelectItem={(item) => {
              dispatch(typesActions.updateSelectedDraw(item.value));
              hideModal();
            }}
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

export default DrawModal;
