import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';

import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import DropDownPicker from 'react-native-dropdown-picker';
import Styles from '../Styles';
import colors from '../../../../Styles/Colors';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import {useDispatch, useSelector} from 'react-redux';
import {printerActions} from '../../../../store/actions';
import {printTest, listPairedDevices} from '../../../../helper/printer';

// Define types for Redux state
interface RootState {
  printer: {
    selectedPrinter: any;
    printerMacAddress: string | null;
    printerList: any[];
  };
}

const widthScreen = Dimensions.get('window').width;

const PrinterSetup = (props: any) => {
  const {navigation} = props;
  const dispatch = useDispatch();
  const selectedPrinter = useSelector(
    (state: RootState) => state.printer.selectedPrinter,
  );
  const printerMacAddress = useSelector(
    (state: RootState) => state.printer.printerMacAddress,
  );

  const [isPrinting, setIsPrinting] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [open, setOpen] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<any[]>([]);
  const [items, setItems] = useState<Array<{label: string; value: string}>>([]);

  // Discover printers on mount
  useEffect(() => {
    discoverPrinters();
  }, []);

  const discoverPrinters = async () => {
    setIsDiscovering(true);
    try {
      const devices = await listPairedDevices();
      if (devices && devices.length > 0) {
        setAvailablePrinters(devices);
        const printerItems = devices.map((device: any) => ({
          label: device.deviceName || device.name || 'Unknown Printer',
          value: device.macAddress,
        }));
        setItems(printerItems);

        // Auto-select first printer if none selected
        if (!selectedPrinter && devices.length > 0) {
          const firstPrinter = {
            name: devices[0].deviceName || devices[0].name || 'Default Printer',
            macAddress: devices[0].macAddress,
          };
          dispatch(printerActions.updateSelectedPrinter(firstPrinter));
        } else if (selectedPrinter && typeof selectedPrinter === 'object') {
          // Ensure current selection is in the list
          const currentInList = devices.find(
            (d: any) => d.macAddress === selectedPrinter.macAddress,
          );
          if (!currentInList) {
            // Current printer not found, select first available
            const firstPrinter = {
              name: devices[0].deviceName || devices[0].name || 'Default Printer',
              macAddress: devices[0].macAddress,
            };
            dispatch(printerActions.updateSelectedPrinter(firstPrinter));
          }
        }
      } else {
        Alert.alert(
          'No Printers Found',
          'Please pair your printer via Bluetooth settings first.',
        );
      }
    } catch (error: any) {
      console.error('Error discovering printers:', error);
      Alert.alert('Error', 'Failed to discover printers: ' + (error.message || 'Unknown error'));
    } finally {
      setIsDiscovering(false);
    }
  };

  const handlePrinterSelect = (item: any) => {
    if (item && item.value) {
      const printer = availablePrinters.find(
        (p: any) => p.macAddress === item.value,
      );
      if (printer) {
        const printerObj = {
          name: printer.deviceName || printer.name || 'Default Printer',
          macAddress: printer.macAddress,
        };
        dispatch(printerActions.updateSelectedPrinter(printerObj));
      }
    }
  };

  const handleTestPrint = async () => {
    if (!printerMacAddress) {
      Alert.alert('Error', 'No printer selected. Please select a printer first.');
      return;
    }

    setIsPrinting(true);
    try {
      await printTest();
      Alert.alert('Success', 'Test print completed successfully');
    } catch (error: any) {
      console.error('Test print error:', error);
      Alert.alert(
        'Print Error',
        error.message || 'Failed to print. Please check your printer connection.',
      );
    } finally {
      setIsPrinting(false);
    }
  };

  const getSelectedValue = () => {
    if (selectedPrinter && typeof selectedPrinter === 'object') {
      return selectedPrinter.macAddress;
    }
    return printerMacAddress || null;
  };

  const getSelectedPrinterName = () => {
    if (selectedPrinter && typeof selectedPrinter === 'object') {
      return selectedPrinter.name;
    }
    return 'Default Printer';
  };

  return (
    <SafeAreaView style={Styles.backgroundWrapper}>
      <View style={Styles.mainContainer}>
        <View style={Styles.headerContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <MaterialIcon name="arrow-back" size={24} color={colors.Black} />
          </TouchableOpacity>
          <Text style={Styles.logoText}>{'Printer Setup'}</Text>
          <View style={styles.placeholder} />
        </View>
        <ScrollView style={styles.container}>
          <View style={styles.contentContainer}>
            <Text style={styles.labelText}>Select Printer</Text>

            {isDiscovering ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primaryColor} />
                <Text style={styles.loadingText}>Discovering printers...</Text>
              </View>
            ) : (
              <View style={styles.dropdownWrapper}>
                <DropDownPicker
                  open={open}
                  value={getSelectedValue()}
                  items={items}
                  setOpen={setOpen}
                  setValue={() => {}}
                  setItems={setItems}
                  onSelectItem={handlePrinterSelect}
                  style={styles.dropdown}
                  dropDownContainerStyle={styles.dropdownContainer}
                  listMode="SCROLLVIEW"
                  scrollViewProps={{
                    nestedScrollEnabled: true,
                  }}
                  placeholder="Select a printer"
                  placeholderStyle={styles.placeholderStyle}
                  textStyle={styles.textStyle}
                />
              </View>
            )}

            {selectedPrinter && (
              <View style={styles.printerContainer}>
                <View style={styles.printerInfo}>
                  <MaterialIcon
                    name="print"
                    size={30}
                    color={colors.primaryColor}
                  />
                  <View style={styles.printerDetails}>
                    <Text style={styles.printerName}>
                      {getSelectedPrinterName()}
                    </Text>
                    <Text style={styles.printerStatus}>
                      {printerMacAddress || 'Not configured'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={discoverPrinters}
              disabled={isDiscovering}>
              <MaterialIcon name="refresh" size={20} color={colors.primaryColor} />
              <Text style={styles.refreshButtonText}>Refresh Printers</Text>
            </TouchableOpacity>

            <View style={styles.infoContainer}>
              <MaterialIcon
                name="info-outline"
                size={24}
                color={colors.primaryColor}
              />
              <Text style={styles.infoText}>
                Select your printer from the list above. Make sure it's paired via
                Bluetooth settings first.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.testButton, isPrinting && styles.testButtonDisabled]}
              onPress={handleTestPrint}
              disabled={isPrinting}>
              {isPrinting ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator size="small" color={colors.White} />
                  <Text style={styles.testButtonText}>Printing...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <MaterialIcon name="print" size={20} color={colors.White} />
                  <Text style={styles.testButtonText}>Test Print</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: wp(5),
    paddingTop: hp(2),
  },
  backButton: {
    padding: 5,
  },
  placeholder: {
    width: 34, // Same width as back button to center the title
  },
  labelText: {
    fontSize: 18,
    color: colors.textColor,
    fontWeight: 'bold',
    marginBottom: hp(2),
    marginTop: hp(1),
  },
  printerContainer: {
    backgroundColor: colors.White,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.mediumGrey,
    padding: wp(4),
    marginBottom: hp(3),
  },
  printerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  printerDetails: {
    marginLeft: wp(3),
    flex: 1,
  },
  printerName: {
    fontSize: 16,
    color: colors.textColor,
    fontWeight: 'bold',
    marginBottom: hp(0.5),
  },
  printerStatus: {
    fontSize: 14,
    color: colors.mediumGreen,
    fontWeight: '500',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    padding: wp(4),
    borderRadius: 8,
    marginTop: hp(2),
    marginBottom: hp(3),
  },
  infoText: {
    fontSize: 14,
    color: colors.textColor,
    marginLeft: wp(2),
    flex: 1,
  },
  testButton: {
    backgroundColor: colors.primaryColor,
    paddingVertical: hp(2.5),
    paddingHorizontal: wp(5),
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(2),
  },
  testButtonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonText: {
    color: colors.White,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: wp(2),
  },
  dropdownWrapper: {
    marginBottom: hp(2),
    zIndex: 1000,
  },
  dropdown: {
    width: '100%',
    backgroundColor: colors.White,
    borderColor: colors.mediumGrey,
    borderRadius: 8,
    minHeight: 50,
  },
  dropdownContainer: {
    backgroundColor: colors.White,
    borderColor: colors.mediumGrey,
    borderRadius: 8,
  },
  placeholderStyle: {
    color: colors.darkGrey,
  },
  textStyle: {
    fontSize: 16,
    color: colors.textColor,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: hp(3),
    marginBottom: hp(2),
  },
  loadingText: {
    marginTop: hp(1),
    fontSize: 14,
    color: colors.darkGrey,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primaryColor,
    marginBottom: hp(2),
  },
  refreshButtonText: {
    color: colors.primaryColor,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: wp(2),
  },
});

export default PrinterSetup;

