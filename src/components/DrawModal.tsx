import React, {useState, useCallback, useMemo} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {StyleSheet, Dimensions} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import {typesActions} from '../store/actions';
import BaseModal from './shared/BaseModal';
import {palette} from '../theme/colors';
import {fontFamily, fontSize} from '../theme/typography';
import {borderRadius} from '../theme/spacing';

const widthScreen = Dimensions.get('window').width;

interface RootState {
  types: {
    selectedDraw: number;
  };
}

interface DrawModalProps {
  hide: () => void;
}

const DrawModal: React.FC<DrawModalProps> = React.memo(({hide}) => {
  const dispatch = useDispatch();
  const selectedDraw = useSelector(
    (state: RootState) => state.types.selectedDraw,
  );

  const [value, setValue] = useState(selectedDraw);
  const [open, setOpen] = useState(false);

  // Memoize the dropdown items to prevent unnecessary re-renders
  const items = useMemo(
    () => [
      {label: '1st Draw', value: 1},
      {label: '2nd Draw', value: 2},
      {label: '3rd Draw', value: 3},
    ],
    [],
  );

  const handleSelectItem = useCallback(
    (item: any) => {
      if (item && item.value !== undefined) {
        dispatch(typesActions.updateSelectedDraw(item.value));
        hide();
      }
    },
    [dispatch, hide],
  );

  const handleClose = useCallback(() => {
    hide();
  }, [hide]);

  return (
    <BaseModal title="Select Draw" onClose={handleClose} height={0.2}>
      <DropDownPicker
        open={open}
        value={value}
        items={items}
        setOpen={setOpen}
        setValue={setValue}
        setItems={() => {}} // No need to set items as they're static
        onSelectItem={handleSelectItem}
        style={styles.dropdown}
        dropDownContainerStyle={styles.dropdownContainer}
        listMode="SCROLLVIEW"
        scrollViewProps={{
          nestedScrollEnabled: true,
        }}
        placeholder="Select a draw"
        placeholderStyle={styles.placeholderStyle}
        textStyle={styles.textStyle}
      />
    </BaseModal>
  );
});

DrawModal.displayName = 'DrawModal';

const styles = StyleSheet.create({
  dropdown: {
    width: widthScreen / 1.5,
    alignSelf: 'center',
    backgroundColor: 'transparent',
    borderColor: palette.gray[300],
    borderRadius: borderRadius.md,
  },
  dropdownContainer: {
    width: widthScreen / 1.5,
    zIndex: 1000,
    alignSelf: 'center',
    backgroundColor: palette.white,
    borderColor: palette.gray[300],
    borderRadius: borderRadius.md,
  },
  placeholderStyle: {
    color: palette.gray[400],
    fontFamily: fontFamily.regular,
  },
  textStyle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.medium,
    color: palette.gray[900],
  },
});

export default DrawModal;
