import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {StyleSheet, Dimensions} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import {typesActions} from '../store/actions';
import BaseModal from './shared/BaseModal';
import Type from '../models/Type';
import {palette} from '../theme/colors';
import {fontFamily, fontSize} from '../theme/typography';
import {borderRadius} from '../theme/spacing';

const widthScreen = Dimensions.get('window').width;

interface RootState {
  types: {
    selectedType: number;
    types: Type[];
  };
}

interface TypeModalProps {
  hide: () => void;
}

const TypeModal: React.FC<TypeModalProps> = React.memo(({hide}) => {
  const dispatch = useDispatch();
  const selectedType = useSelector(
    (state: RootState) => state.types.selectedType,
  );
  const types = useSelector((state: RootState) => state.types.types);

  const [value, setValue] = useState(selectedType);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Array<{label: string; value: number}>>([]);

  // Memoize the dropdown items to prevent unnecessary re-renders
  const dropdownItems = useMemo(
    () =>
      types.map((item: Type) => ({
        label: item.name,
        value: item.bettypeid,
      })),
    [types],
  );

  useEffect(() => {
    setItems(dropdownItems);
  }, [dropdownItems]);

  const handleSelectItem = useCallback(
    (item: any) => {
      if (item && item.value !== undefined) {
        dispatch(typesActions.updateSelectedType(item.value));
        hide();
      }
    },
    [dispatch, hide],
  );

  const handleClose = useCallback(() => {
    hide();
  }, [hide]);

  return (
    <BaseModal title="Select Type" onClose={handleClose} height={0.2}>
      <DropDownPicker
        open={open}
        value={value}
        items={items}
        setOpen={setOpen}
        setValue={setValue}
        setItems={setItems}
        onSelectItem={handleSelectItem}
        style={styles.dropdown}
        dropDownContainerStyle={styles.dropdownContainer}
        listMode="SCROLLVIEW"
        scrollViewProps={{
          nestedScrollEnabled: true,
        }}
        placeholder="Select a type"
        placeholderStyle={styles.placeholderStyle}
        textStyle={styles.textStyle}
      />
    </BaseModal>
  );
});

TypeModal.displayName = 'TypeModal';

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

export default TypeModal;
