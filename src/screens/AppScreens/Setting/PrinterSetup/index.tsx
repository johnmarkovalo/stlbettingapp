import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';

import Icon from '../../../../components/shared/Icon';
import Styles from '../Styles';
import {palette} from '../../../../theme/colors';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import {printTest} from '../../../../helper/printer';
import NyxPrinter, {
  PrintAlign,
  PrinterStatus,
  BarcodeTextPosition,
  LcdOpt,
  BitmapType,
} from '../../../../native/nyx-printer';
import {DeviceEventEmitter} from 'react-native';

const PrinterSetup = (props: any) => {
  const {navigation} = props;

  const [isPrinting, setIsPrinting] = useState(false);
  const [showNyxDemo, setShowNyxDemo] = useState(false);
  const [nyxLog, setNyxLog] = useState<string>('');
  const [printerVersion, setPrinterVersion] = useState<string | undefined>();
  const [printerServiceVersion, setPrinterServiceVersion] = useState<string | undefined>();
  const [printerStatus, setPrinterStatus] = useState<string>('Checking...');

  // Initialize printer info on mount
  useEffect(() => {
    _getNyxPrinterVersion();
    _getNyxPrinterServiceVersion();
    _checkPrinterStatus();

    // register scanner listener
    const scanListener = DeviceEventEmitter.addListener('onScanResult', (res) => {
      appendNyxLog(`scan result: ${JSON.stringify(res)}`);
    });

    return () => {
      scanListener.remove();
    };
  }, []);

  const appendNyxLog = (msg: string) => {
    setNyxLog(prev => prev ? prev + '\n' + msg : msg);
  };

  const _getNyxPrinterVersion = async () => {
    try {
      let res = await NyxPrinter.getPrinterVersion();
      setPrinterVersion(res);
    } catch (e) {
      appendNyxLog(`getPrinterVersion: ${e}`);
    }
  };

  const _getNyxPrinterServiceVersion = async () => {
    try {
      let res = await NyxPrinter.getServiceVersion();
      setPrinterServiceVersion(res);
    } catch (e) {
      appendNyxLog(`getPrinterServiceVersion: ${e}`);
    }
  };

  const _checkPrinterStatus = async () => {
    try {
      const status = await NyxPrinter.getPrinterStatus();
      if (status === PrinterStatus.SDK_OK) {
        setPrinterStatus('Ready');
      } else {
        setPrinterStatus(`Status: ${PrinterStatus.msg(status)}`);
      }
    } catch (e) {
      setPrinterStatus('Error: ' + (e?.message || 'Unknown'));
      appendNyxLog(`getPrinterStatus: ${e}`);
    }
  };

  const handleTestPrint = async () => {
    setIsPrinting(true);
    try {
      await printTest();
      Alert.alert('Success', 'Test print completed successfully');
      // Refresh status after print
      await _checkPrinterStatus();
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

  // Nyx Printer Demo Functions
  const imageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANwAAADcCAIAAACUOFjWAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAEOklEQVR4nO3dQY4jNxAAQcvw/7+8vvlgqIEtiEWnxhHnhdSrSfBQINmvX79+/QElf/7XDwD/JkpyREmOKMkRJTmiJEeU5IiSHFGSI0pyREmOKMkRJTmiJOev0b9+vV5Lz3HE2214nWce7RJ8euz4//Gt6fZIKyU5oiRHlOSIkhxRkiNKcmYjobfun4ccTUCeHm80cznyJCNHftX4n+aJlZIcUZIjSnJESY4oyRElOaIk58Cc8smRkVX8UrjPN5JNf6XPf5D+38VKSY4oyRElOaIkR5TkiJKcxZFQxOoWtb19bvFZ2CorJTmiJEeU5IiSHFGSI0pyREnOz59T3h/4jQ71rp4A/lJWSnJESY4oyRElOaIkR5TkiJKcxTnll07URtPEkdGH7P16/b+LlZIcUZIjSnJESY4oyRElOQdGQvG3Va7uAft8N9qXvrxilZWSHFGSI0pyREmOKMkRJTmiJOfV38h02ecX9rny70NWSnJESY4oyRElOaIkR5Tk3H5h6HSn1sjnA5rph+ztDbs/V9rbLDd9PCslOaIkR5TkiJIcUZIjSnJESc5sTnl5W9fThxyxd5Ha3sz1yIdP55F719A9sVKSI0pyREmOKMkRJTmiJEeU5HzlEdvVvYZ720BHQ837U8POyWArJTmiJEeU5IiSHFGSI0pyvnIkdN/eUdr7E6sj3/jkSE5WSnJESY4oyRElOaIkR5TkiJKc20dsj3zyyOog8Pc/YWr0IaP9b0eu/FudjFopyRElOaIkR5TkiJIcUZIjGwndv2RspPOKic8/uXMH2u8/xilWSnJESY4oyRElOaIkR5TkiJKc2RHbbxySdc4QH7nPbW83WudXtVKSI0pyREmOKMkRJTmiJOfArWtH5hGjD997meaTzjfuPUZndmalJEeU5IiSHFGSI0pyREmOKMk5cOva6unYzw+8Hhkx3h8Erp5hHfn8Sdy6xtcTJTmiJEeU5IiSHFGSI0pyDlwFeMSRVxO8df+uvdUJ6N7+1yO8xZafSZTkiJIcUZIjSnJESc7iC0PvezuPOHKt2ZO9bV17Lww9wq1r/L+IkhxRkiNKckRJjijJESU5sznlW/G3Q0xHiZdnsZ1b/DpDaCslOaIkR5TkiJIcUZIjSnIOjISedIYdl79x9VK4n/QGjCdWSnJESY4oyRElOaIkR5TkiJKcxTllRGf89tb9k779Q71WSnJESY4oyRElOaIkR5TkiJKcnz+nPDKPPDIIHP3j+6PHI6/LOPKeYyslOaIkR5TkiJIcUZIjSnIWR0L3T8e+NX2MvenP6OtGM5f7ryhd3fhnpSRHlOSIkhxRkiNKckRJjijJOTCnjJxVndrb0ta5vjCydW3KSkmOKMkRJTmiJEeU5IiSnFdkgxn8w0pJjijJESU5oiRHlOSIkhxRkiNKckRJjijJESU5oiRHlOSIkhxRkvM3gRuB4OZ3Cs0AAAAASUVORK5CYII=';

  const _nyxPrintTest = async () => {
    try {
      let ret = await NyxPrinter.getPrinterStatus();
      if (ret != PrinterStatus.SDK_OK) {
        appendNyxLog(`printer status: ${PrinterStatus.msg(ret)}`);
        return;
      }
      await NyxPrinter.printText("Receipt", { textSize: 48, align: PrintAlign.CENTER });
      await NyxPrinter.printText(`\nOrder Time:\t${Date.now()}\n`, { align: PrintAlign.CENTER });
      let weights = [1, 1, 1, 1];
      let row1 = ["ITEM", "QTY", "PRICE", "TOTAL"];
      let row2 = ["Apple", "1", "2.00", "2.00"];
      let row3 = ["Orange", "1", "2.00", "2.00"];
      let row4 = ["Banana", "1", "2.00", "2.00"];
      let row5 = ["Cherry", "1", "2.00", "2.00"];
      let styles2 = [
        { align: PrintAlign.CENTER },
        { align: PrintAlign.CENTER },
        { align: PrintAlign.CENTER },
        { align: PrintAlign.CENTER }
      ];
      await NyxPrinter.printTableText(row1, weights, styles2);
      await NyxPrinter.printTableText(row2, weights, styles2);
      await NyxPrinter.printTableText(row3, weights, styles2);
      await NyxPrinter.printTableText(row4, weights, styles2);
      await NyxPrinter.printTableText(row5, weights, styles2);
      await NyxPrinter.printText("\nOrder Price: \t\t9999.00\n", { align: PrintAlign.CENTER });
      await NyxPrinter.printQrCode(Date.now().toString(), 300, 300, PrintAlign.CENTER);
      await NyxPrinter.printText("\n", {});
      await NyxPrinter.printBarcode(Date.now().toString(), 300, 150, BarcodeTextPosition.TEXT_BELOW, PrintAlign.CENTER);
      await NyxPrinter.printBitmap(imageBase64, BitmapType.BLACK_WHITE, PrintAlign.CENTER);
      await NyxPrinter.printText("\n***Print Complete***", { align: PrintAlign.CENTER });
      await NyxPrinter.printEndAutoOut();
      appendNyxLog('Print test completed successfully');
    } catch (e) {
      appendNyxLog(`printTest: ${e}`);
    }
  };

  const _showLcd = async () => {
    try {
      await NyxPrinter.configLcd(LcdOpt.INIT);
      await NyxPrinter.showLcdBitmap(imageBase64);
      appendNyxLog('LCD bitmap shown');
    } catch (e) {
      appendNyxLog(`showLcd: ${e}`);
    }
  };

  const _resetLcd = async () => {
    try {
      await NyxPrinter.configLcd(LcdOpt.INIT);
      await NyxPrinter.configLcd(LcdOpt.RESET);
      appendNyxLog('LCD reset');
    } catch (e) {
      appendNyxLog(`resetLcd: ${e}`);
    }
  };

  const _wakeupLcd = async () => {
    try {
      await NyxPrinter.configLcd(LcdOpt.INIT);
      await NyxPrinter.configLcd(LcdOpt.WAKEUP);
      appendNyxLog('LCD wakeup');
    } catch (e) {
      appendNyxLog(`wakeupLcd: ${e}`);
    }
  };

  const _sleepLcd = async () => {
    try {
      await NyxPrinter.configLcd(LcdOpt.INIT);
      await NyxPrinter.configLcd(LcdOpt.SLEEP);
      appendNyxLog('LCD sleep');
    } catch (e) {
      appendNyxLog(`sleepLcd: ${e}`);
    }
  };

  const _cameraScan = async () => {
    try {
      await NyxPrinter.scan({});
      appendNyxLog('Camera scan initiated');
    } catch (e) {
      appendNyxLog(`cameraScan: ${e}`);
    }
  };

  const _infraredScan = async () => {
    try {
      await NyxPrinter.qscScan();
      appendNyxLog('Infrared scan initiated');
    } catch (e) {
      appendNyxLog(`infraredScan: ${e}`);
    }
  };

  const _openCashBox = async () => {
    try {
      await NyxPrinter.openCashBox();
      appendNyxLog('Cash box opened');
    } catch (e) {
      appendNyxLog(`openCashBox: ${e}`);
    }
  };

  return (
    <SafeAreaView style={Styles.backgroundWrapper}>
      <View style={Styles.mainContainer}>
        <View style={Styles.headerContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={localStyles.backButton}>
            <Icon name="ArrowLeft" size={24} color={palette.black} weight="bold" />
          </TouchableOpacity>
          <Text style={Styles.logoText}>{'Printer Setup'}</Text>
          <View style={localStyles.placeholder} />
        </View>
        <ScrollView style={localStyles.container}>
          <View style={localStyles.contentContainer}>
            <View style={localStyles.printerContainer}>
              <View style={localStyles.printerInfo}>
                <Icon
                  name="Printer"
                  size={30}
                  color={palette.primary[500]}
                  weight="bold"
                />
                <View style={localStyles.printerDetails}>
                  <Text style={localStyles.printerName}>Nyx Built-in Printer</Text>
                  <Text style={localStyles.printerStatus}>{printerStatus}</Text>
                  {printerVersion && (
                    <Text style={localStyles.printerVersionText}>
                      Version: {printerVersion}
                    </Text>
                  )}
                  {printerServiceVersion && (
                    <Text style={localStyles.printerVersionText}>
                      Service: {printerServiceVersion}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            <View style={localStyles.infoContainer}>
              <Icon
                name="Info"
                size={24}
                color={palette.primary[500]}
                weight="bold"
              />
              <Text style={localStyles.infoText}>
                This device uses the built-in Nyx printer. No Bluetooth pairing required.
                The printer is automatically connected and ready to use.
              </Text>
            </View>

            <TouchableOpacity
              style={[localStyles.testButton, isPrinting && localStyles.testButtonDisabled]}
              onPress={handleTestPrint}
              disabled={isPrinting}>
              {isPrinting ? (
                <View style={localStyles.buttonContent}>
                  <ActivityIndicator size="small" color={palette.white} />
                  <Text style={localStyles.testButtonText}>Printing...</Text>
                </View>
              ) : (
                <View style={localStyles.buttonContent}>
                  <Icon name="Printer" size={20} color={palette.white} weight="bold" />
                  <Text style={localStyles.testButtonText}>Test Print</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Nyx Printer Demo Section */}
            <View style={localStyles.nyxSection}>
              <TouchableOpacity
                style={localStyles.nyxHeader}
                onPress={() => setShowNyxDemo(!showNyxDemo)}>
                <View style={localStyles.nyxHeaderContent}>
                  <Icon
                    name={showNyxDemo ? "CaretUp" : "CaretDown"}
                    size={24}
                    color={palette.primary[500]}
                    weight="bold"
                  />
                  <Text style={localStyles.nyxHeaderText}>Nyx Printer Demo</Text>
                </View>
              </TouchableOpacity>

              {showNyxDemo && (
                <View style={localStyles.nyxDemoContent}>
                  <View style={localStyles.nyxInfoContainer}>
                    <Text style={localStyles.nyxInfoText}>
                      Printer Version: {printerVersion || 'Loading...'}
                    </Text>
                    <Text style={localStyles.nyxInfoText}>
                      Service Version: {printerServiceVersion || 'Loading...'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={localStyles.nyxButton}
                    onPress={_nyxPrintTest}>
                    <Icon name="Printer" size={20} color={palette.white} weight="bold" />
                    <Text style={localStyles.nyxButtonText}>Print Test Receipt</Text>
                  </TouchableOpacity>

                  <View style={localStyles.nyxButtonRow}>
                    <TouchableOpacity
                      style={[localStyles.nyxButtonSmall, localStyles.nyxButtonLeft]}
                      onPress={_showLcd}>
                      <Text style={localStyles.nyxButtonSmallText}>LCD Show</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[localStyles.nyxButtonSmall, localStyles.nyxButtonRight]}
                      onPress={_resetLcd}>
                      <Text style={localStyles.nyxButtonSmallText}>LCD Reset</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={localStyles.nyxButtonRow}>
                    <TouchableOpacity
                      style={[localStyles.nyxButtonSmall, localStyles.nyxButtonLeft]}
                      onPress={_wakeupLcd}>
                      <Text style={localStyles.nyxButtonSmallText}>LCD Wakeup</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[localStyles.nyxButtonSmall, localStyles.nyxButtonRight]}
                      onPress={_sleepLcd}>
                      <Text style={localStyles.nyxButtonSmallText}>LCD Sleep</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={localStyles.nyxButtonRow}>
                    <TouchableOpacity
                      style={[localStyles.nyxButtonSmall, localStyles.nyxButtonLeft]}
                      onPress={_cameraScan}>
                      <Text style={localStyles.nyxButtonSmallText}>Camera Scan</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[localStyles.nyxButtonSmall, localStyles.nyxButtonRight]}
                      onPress={_infraredScan}>
                      <Text style={localStyles.nyxButtonSmallText}>Infrared Scan</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={localStyles.nyxButton}
                    onPress={_openCashBox}>
                    <Icon name="Wallet" size={20} color={palette.white} weight="bold" />
                    <Text style={localStyles.nyxButtonText}>Open Cash Box</Text>
                  </TouchableOpacity>

                  {nyxLog && (
                    <View style={localStyles.nyxLogContainer}>
                      <Text style={localStyles.nyxLogTitle}>Log:</Text>
                      <ScrollView style={localStyles.nyxLogScroll}>
                        <Text style={localStyles.nyxLogText}>{nyxLog}</Text>
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
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
  printerContainer: {
    backgroundColor: palette.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.gray[300],
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
    color: palette.gray[800],
    fontWeight: 'bold',
    marginBottom: hp(0.5),
  },
  printerStatus: {
    fontSize: 14,
    color: palette.success[500],
    fontWeight: '500',
    marginTop: hp(0.5),
  },
  printerVersionText: {
    fontSize: 12,
    color: palette.gray[500],
    marginTop: hp(0.3),
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.gray[50],
    padding: wp(4),
    borderRadius: 8,
    marginTop: hp(2),
    marginBottom: hp(3),
  },
  infoText: {
    fontSize: 14,
    color: palette.gray[800],
    marginLeft: wp(2),
    flex: 1,
    lineHeight: 20,
  },
  testButton: {
    backgroundColor: palette.primary[500],
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
    color: palette.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: wp(2),
  },
  nyxSection: {
    marginTop: hp(3),
    backgroundColor: palette.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.gray[300],
    overflow: 'hidden',
  },
  nyxHeader: {
    padding: wp(4),
    backgroundColor: palette.gray[50],
  },
  nyxHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nyxHeaderText: {
    fontSize: 18,
    color: palette.gray[800],
    fontWeight: 'bold',
    marginLeft: wp(2),
  },
  nyxDemoContent: {
    padding: wp(4),
  },
  nyxInfoContainer: {
    backgroundColor: palette.gray[50],
    padding: wp(3),
    borderRadius: 8,
    marginBottom: hp(2),
  },
  nyxInfoText: {
    fontSize: 14,
    color: palette.gray[800],
    marginBottom: hp(0.5),
  },
  nyxButton: {
    backgroundColor: palette.primary[500],
    paddingVertical: hp(2),
    paddingHorizontal: wp(4),
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: hp(1.5),
  },
  nyxButtonText: {
    color: palette.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: wp(2),
  },
  nyxButtonRow: {
    flexDirection: 'row',
    marginBottom: hp(1.5),
  },
  nyxButtonSmall: {
    flex: 1,
    backgroundColor: palette.primary[500],
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(3),
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nyxButtonLeft: {
    marginRight: wp(1),
  },
  nyxButtonRight: {
    marginLeft: wp(1),
  },
  nyxButtonSmallText: {
    color: palette.white,
    fontSize: 14,
    fontWeight: '600',
  },
  nyxLogContainer: {
    marginTop: hp(2),
    backgroundColor: palette.gray[50],
    borderRadius: 8,
    padding: wp(3),
    maxHeight: hp(20),
  },
  nyxLogTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: palette.gray[800],
    marginBottom: hp(1),
  },
  nyxLogScroll: {
    maxHeight: hp(15),
  },
  nyxLogText: {
    fontSize: 12,
    color: palette.gray[500],
    fontFamily: 'monospace',
  },
});

export default PrinterSetup;
