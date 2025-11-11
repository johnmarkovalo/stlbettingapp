import React, {useEffect, useRef, useState, useCallback, useMemo} from 'react';
import {
  Dimensions,
  FlatList,
  SafeAreaView,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import Styles from './Styles';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import Colors from '../../../Styles/Colors';
import {ResultTransactionItem} from '../../../components/ResultTransactionItem';
import {
  checkInternetConnection,
  formatNumberWithCommas,
  getCurrentDraw,
} from '../../../helper';
import ResultTransactionBets from '../../../components/ResultTransactionBets';
import DatePicker from 'react-native-date-picker';
import moment from 'moment';
import DrawModal from '../../../components/DrawModal';
import TypeModal from '../../../components/TypeModal';
import Type from '../../../models/Type';
import type ResultModel from '../../../models/Result';
import Ionic from 'react-native-vector-icons/Ionicons';
import {
  getResult,
  getWinners,
  updateTransactionStatus,
  insertOrUpdateResult,
  getTransactionByTicketCode,
  getWinningTransactionBets,
} from '../../../database';
import {useDispatch, useSelector} from 'react-redux';
import {checkTransactionAPI, syncResultAPI} from '../../../helper/api';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import {printHits, printSales} from '../../../helper/printer';
import debounce from 'lodash/debounce';
import {typesActions} from '../../../store/actions';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

// Define types for Redux state
interface RootState {
  auth: {
    user: any;
    token: string;
  };
  types: {
    types: Type[];
    selectedType: number;
    selectedDraw: number;
  };
}

const widthScreen = Dimensions.get('window').width;
const heightScreen = Dimensions.get('window').height;

const Result: React.FC<any> = ({navigation}) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const betTypes = useSelector((state: RootState) => state.types.types);
  const selectedType = useSelector(
    (state: RootState) => state.types.selectedType,
  );
  const selectedDraw = useSelector(
    (state: RootState) => state.types.selectedDraw,
  );

  const dispatch = useDispatch();
  const internetStatusCheck = useRef(checkInternetConnection());

  // Refs for optimization
  const lastFetchTime = useRef<number | undefined>();
  const lastFetchCallTime = useRef<number | undefined>();
  const prevDrawRef = useRef<number | undefined>();
  const prevTypeRef = useRef<number | undefined>();
  const prevDateRef = useRef<string | undefined>();

  // State
  const [showQRCam, setShowQRCam] = useState(false);
  const [enableQRCam, setEnableQRCam] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState({title: '', message: ''});
  const [betModalVisible, setBetModalVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [drawModalVisible, setDrawModalVisible] = useState(false);
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [result, setResult] = useState<ResultModel | null>(null);
  const [totalAmount, setTotalAmount] = useState({
    totalTarget: 0,
    totalRambol: 0,
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<{
    id: number;
    ticketcode: string;
  } | null>(null);

  // Camera
  const cameraDevice = useCameraDevice('back');

  // Memoized values
  const minDate = useMemo(() => moment().subtract(1, 'weeks').toDate(), []);
  const maxDate = useMemo(() => moment().toDate(), []);
  const formattedDate = useMemo(
    () => moment(selectedDate).format('YYYY-MM-DD'),
    [selectedDate],
  );

  // Memoized functions
  const typeLabel = useCallback(() => {
    const matchingItems = betTypes.filter(
      (item: Type) => item.bettypeid === selectedType,
    );
    return matchingItems.length > 0 ? matchingItems[0].name : null;
  }, [betTypes, selectedType]);

  const hasInternet = useCallback(() => {
    return (
      internetStatusCheck.current.isConnected() &&
      !internetStatusCheck.current.isSlow()
    );
  }, []);

  const handleEmptyResult = useCallback(() => {
    setResult(null);
    setTransactions([]);
    setTotalAmount({totalTarget: 0, totalRambol: 0});
  }, []);

  const handleNoInternet = useCallback(() => {
    Alert.alert('Error', 'No/Slow internet connection');
    handleEmptyResult();
  }, [handleEmptyResult]);

  const processQR = useCallback(
    async (ticketcode: string) => {
      try {
        console.log('processQR');
        let response = await checkTransactionAPI(ticketcode, token);
        if (response && typeof response === 'object' && 'message' in response) {
          setAlertModalVisible(true);
          setModalMessage({
            title: 'Scanned Ticket',
            message: response.message as string,
          });
        }
      } catch (e: any) {
        console.error(e?.message || 'Unknown error');
      }
    },
    [token],
  );

  const debouncedProcessQr = useMemo(
    () => debounce(processQR, 200),
    [processQR],
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      if (!internetStatusCheck.current.isConnected()) {
        Alert.alert('No internet connection');
        return;
      }
      if (codes && codes.length > 0 && codes[0]?.value?.length === 21) {
        setEnableQRCam(false);
        setTimeout(async () => {
          setShowQRCam(false);
        }, 300);
        debouncedProcessQr(codes[0].value as string);
      } else {
        Alert.alert('Invalid QR code');
      }
    },
  });

  const getNewWinners = useCallback(
    async (newResult: ResultModel | null) => {
      if (!newResult || !newResult.result) {
        setTransactions([]);
        setTotalAmount({totalTarget: 0, totalRambol: 0});
        return;
      }

      const betType = betTypes.find(item => item.bettypeid === selectedType);
      if (!betType) {
        setTransactions([]);
        setTotalAmount({totalTarget: 0, totalRambol: 0});
        return;
      }

      const transactions = await getWinners(betType, newResult);
      console.log('getNewWinners', transactions);

      if (
        transactions &&
        Array.isArray(transactions) &&
        transactions.length > 0
      ) {
        setTransactions(transactions as any[]);
        // Optimize total calculation using reduce
        const totals = (transactions as any[]).reduce(
          (acc, item: any) => ({
            totalTarget: acc.totalTarget + (item.targetTotal || 0),
            totalRambol: acc.totalRambol + (item.rambolTotal || 0),
          }),
          {totalTarget: 0, totalRambol: 0},
        );
        setTotalAmount(totals);
      } else {
        setTransactions([]);
        setTotalAmount({totalTarget: 0, totalRambol: 0});
      }
    },
    [betTypes, selectedType],
  );

  const normalizeResult = useCallback((data: any): ResultModel | null => {
    if (!data) {
      return null;
    }

    const {result: rawResult, resultr: rawResultr, ...rest} = data;

    return {
      ...rest,
      result: rawResult != null ? String(rawResult) : '',
      resultr: rawResultr != null ? String(rawResultr) : '',
    } as ResultModel;
  }, []);

  const fetchData = useCallback(async () => {
    // Debounce rapid successive calls
    const now = Date.now();
    if (lastFetchCallTime.current && now - lastFetchCallTime.current < 1000) {
      console.log('🔄 Result fetchData - Debounced rapid call');
      return;
    }
    lastFetchCallTime.current = now;

    setRefresh(true);
    try {
      // Validate parameters before making the call
      if (selectedDraw === undefined || selectedType === undefined) {
        console.warn('⚠️ Result fetchData - Missing parameters:', {
          draw: selectedDraw,
          type: selectedType,
        });
        handleEmptyResult();
        return;
      }

      console.log('🔄 Result fetchData - Params:', {
        date: formattedDate,
        draw: selectedDraw,
        type: selectedType,
        typeName: typeLabel(),
      });

      // Fetch local result first (fast, always available)
      const localResultRaw = await getResult(
        formattedDate,
        selectedDraw,
        selectedType,
      );

      const localResult = normalizeResult(localResultRaw);

      console.log('📊 Result fetchData - Local result:', localResultRaw);

      // If we have internet, sync with server
      if (hasInternet()) {
        try {
          const serverResultRaw = await syncResultAPI(
            token,
            selectedType,
            selectedDraw,
            formattedDate,
          );

          console.log('📊 Result fetchData - Server result:', serverResultRaw);

          const serverResult = normalizeResult(serverResultRaw);

          if (serverResult) {
            // Update result and get winners in parallel
            await Promise.all([
              insertOrUpdateResult(serverResult),
              getNewWinners(serverResult),
            ]);
            setResult(serverResult);
          } else {
            // No server result - use local if available
            if (localResult) {
              setResult(localResult);
              await getNewWinners(localResult);
            } else {
              handleEmptyResult();
            }
          }
        } catch (syncError) {
          console.error('❌ Error syncing with server:', syncError);
          // Fallback to local result if server sync fails
          if (localResult) {
            setResult(localResult);
            await getNewWinners(localResult);
          } else {
            handleEmptyResult();
          }
        }
      } else if (localResult) {
        // No internet - use local result
        setResult(localResult);
        await getNewWinners(localResult);
      } else {
        // No internet and no local result
        handleNoInternet();
      }
    } catch (error) {
      console.error('❌ Result fetchData error:', error);
      handleEmptyResult();
    } finally {
      setRefresh(false);
      lastFetchTime.current = Date.now();
    }
  }, [
    formattedDate,
    selectedDraw,
    selectedType,
    typeLabel,
    hasInternet,
    token,
    handleEmptyResult,
    handleNoInternet,
    getNewWinners,
    normalizeResult,
  ]);

  const onRefresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Modal handlers
  const betModalHide = useCallback(() => {
    setBetModalVisible(false);
  }, []);

  const betModalShow = useCallback((transaction: any) => {
    setSelectedTransaction(transaction);
    setBetModalVisible(true);
  }, []);

  const drawModalHide = useCallback(() => {
    setDrawModalVisible(false);
  }, []);

  const drawModalShow = useCallback(() => {
    setDrawModalVisible(true);
  }, []);

  const typeModalHide = useCallback(() => {
    setTypeModalVisible(false);
  }, []);

  const typeModalShow = useCallback(() => {
    setTypeModalVisible(true);
  }, []);

  const dateModalHide = useCallback(() => {
    setDateModalVisible(false);
  }, []);

  const dateModalShow = useCallback(() => {
    setDateModalVisible(true);
  }, []);

  const handleDateConfirm = useCallback((date: Date) => {
    setDateModalVisible(false);
    setSelectedDate(date);
  }, []);

  const hideAlertModal = useCallback(() => {
    setAlertModalVisible(false);
  }, []);

  const hideQRCam = useCallback(() => {
    setShowQRCam(false);
    setEnableQRCam(false);
  }, []);

  const handleScanPress = useCallback(() => {
    if (!hasInternet()) {
      Alert.alert('Error', 'No/Slow internet connection');
      return;
    }
    setShowQRCam(true);
    setEnableQRCam(true);
  }, [hasInternet]);

  const handlePrintHits = useCallback(() => {
    if (!result) {
      return;
    }

    if (totalAmount.totalTarget > 0 || totalAmount.totalRambol > 0) {
      printHits(selectedDate, selectedDraw, typeLabel(), totalAmount, user);
    }
  }, [result, totalAmount, selectedDate, selectedDraw, typeLabel, user]);

  // Render functions
  const renderItem = useCallback(
    ({item}: {item: any}) => (
      <ResultTransactionItem
        key={item.id || item.ticketcode}
        item={item}
        onPress={() => betModalShow(item)}
        onLongPress={() => {
          // Handle long press if needed
        }}
      />
    ),
    [betModalShow],
  );

  const keyExtractor = useCallback(
    (item: any) => item.id?.toString() || item.ticketcode,
    [],
  );

  // Effects
  useEffect(() => {
    // Initial load
    fetchData();
  }, []); // Only run on mount

  // Watch for changes in selectedDraw, selectedType, and selectedDate
  useEffect(() => {
    // Only fetch if values actually changed
    const drawChanged = prevDrawRef.current !== selectedDraw;
    const typeChanged = prevTypeRef.current !== selectedType;
    const dateChanged = prevDateRef.current !== formattedDate;

    if (drawChanged || typeChanged || dateChanged) {
      console.log('🔄 Result - Draw/Type/Date changed, fetching new data...');
      prevDrawRef.current = selectedDraw;
      prevTypeRef.current = selectedType;
      prevDateRef.current = formattedDate;
      fetchData();
    } else {
      // First time, just store the values
      prevDrawRef.current = selectedDraw;
      prevTypeRef.current = selectedType;
      prevDateRef.current = formattedDate;
    }
  }, [selectedDraw, selectedType, formattedDate, fetchData]);

  // Navigation focus effect - only fetch if data is stale
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Only fetch if we haven't fetched recently or if parameters changed
      const timeSinceLastFetch = Date.now() - (lastFetchTime.current || 0);
      const shouldFetch = timeSinceLastFetch > 30000; // 30 seconds threshold

      if (shouldFetch) {
        console.log(
          '🔄 Result - Screen focused, fetching data (stale data)...',
        );
        fetchData();
      } else {
        console.log(
          '🔄 Result - Screen focused, data is fresh, skipping fetch',
        );
      }
    });
    return unsubscribe;
  }, [navigation, fetchData]);

  // Camera view
  if (showQRCam) {
    return (
      <View style={{flex: 1}}>
        {cameraDevice && (
          <Camera
            codeScanner={codeScanner}
            style={Styles.cameraStyle}
            device={cameraDevice}
            isActive={enableQRCam}
          />
        )}
        <View style={styles.cameraButtonContainer}>
          <TouchableOpacity style={styles.cameraButton} onPress={hideQRCam}>
            <Text style={Styles.loginBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={Styles.backgroundWrapper}>
      {/* Alert Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={alertModalVisible}
        onRequestClose={hideAlertModal}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <View style={styles.modalHeaderContainer}>
              <Text style={styles.modalTitle}>{modalMessage.title}</Text>
              <TouchableOpacity
                onPress={hideAlertModal}
                style={styles.closeButton}>
                <Ionic name="close" size={30} style={styles.closeIcon} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBodyContainer}>
              <Text style={styles.alertText}>{modalMessage.message}</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bet Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={betModalVisible}
        onRequestClose={betModalHide}>
        <ResultTransactionBets
          hide={betModalHide}
          result={result}
          transaction={selectedTransaction || {id: 0, ticketcode: ''}}
        />
      </Modal>

      {/* Date Picker */}
      <DatePicker
        modal
        open={dateModalVisible}
        date={selectedDate}
        onConfirm={handleDateConfirm}
        mode="date"
        maximumDate={maxDate}
        minimumDate={minDate}
        onCancel={dateModalHide}
      />

      {/* Draw Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={drawModalVisible}
        onRequestClose={drawModalHide}>
        <DrawModal hide={drawModalHide} />
      </Modal>

      {/* Type Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={typeModalVisible}
        onRequestClose={typeModalHide}>
        <TypeModal hide={typeModalHide} />
      </Modal>

      {/* Main Content */}
      <View style={Styles.mainContainer}>
        {/* Header */}
        <View style={Styles.headerContainer}>
          <Text style={Styles.logoText}>{'Result'}</Text>
          <Text style={styles.resultDisplay}>
            <Text style={styles.resultNumber}>{result?.result ?? ''}</Text>
          </Text>
          {(totalAmount.totalTarget > 0 || totalAmount.totalRambol > 0) && (
            <TouchableOpacity onPress={handlePrintHits}>
              <MaterialIcon name="print" size={40} style={styles.printIcon} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Cards */}
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <TouchableOpacity
              onPress={dateModalShow}
              style={styles.filterButton}>
              <Text style={styles.cardTitle}>DATE</Text>
              <Text style={styles.cardSubTitle}>
                {moment(selectedDate).format('MMM DD, YYYY')}
              </Text>
            </TouchableOpacity>

            <View style={styles.verticalLine} />

            <TouchableOpacity
              onPress={drawModalShow}
              style={styles.filterButton}>
              <Text style={styles.cardTitle}>TIME</Text>
              <Text style={styles.cardSubTitle}>
                {selectedDraw === 1
                  ? '1ST DRAW'
                  : selectedDraw === 2
                    ? '2ND DRAW'
                    : '3RD DRAW'}
              </Text>
            </TouchableOpacity>

            <View style={styles.verticalLine} />

            <TouchableOpacity
              onPress={typeModalShow}
              style={styles.filterButton}>
              <Text style={styles.cardTitle}>Type</Text>
              <Text style={styles.cardSubTitle}>{typeLabel()}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hits Summary */}
        {refresh && <ActivityIndicator style={styles.loader} />}
        {!refresh && (
          <View style={styles.hitsContainer}>
            <Text style={styles.hitLabel}>
              Target:
              <Text style={styles.hitValue}>
                {' ' + formatNumberWithCommas(totalAmount.totalTarget)}
              </Text>
            </Text>
            <Text style={styles.hitLabel}>
              Rambol:
              <Text style={styles.hitValue}>
                {' ' + formatNumberWithCommas(totalAmount.totalRambol)}
              </Text>
            </Text>
          </View>
        )}

        {/* Transaction List */}
        {!refresh && transactions.length > 0 && (
          <FlatList
            data={transactions}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            refreshControl={
              <RefreshControl refreshing={refresh} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}

        {/* Empty States */}
        {!refresh && transactions.length === 0 && !!result?.result && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No Winners</Text>
          </View>
        )}

        {!refresh && (!result || result.result === '') && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No Result Yet</Text>
          </View>
        )}

        {/* Scan Button */}
        <TouchableOpacity style={styles.scanButton} onPress={handleScanPress}>
          <Text style={styles.scanButtonText}>Scan</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

Result.displayName = 'Result';

export default React.memo(Result);

const styles = StyleSheet.create({
  card: {
    height: 60,
    elevation: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  filterButton: {
    width: widthScreen / 3,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    color: Colors.darkGrey,
    fontWeight: 'bold',
    alignSelf: 'center',
    textTransform: 'uppercase',
  },
  cardSubTitle: {
    fontSize: 14,
    color: Colors.primaryColor,
    fontWeight: 'bold',
    alignSelf: 'center',
    textTransform: 'uppercase',
  },
  verticalLine: {
    height: '80%',
    width: 1,
    backgroundColor: 'gray',
  },
  resultDisplay: {
    fontSize: 25,
    color: Colors.Black,
    marginRight: 5,
  },
  resultNumber: {
    fontWeight: 'bold',
    fontSize: 35,
    color: Colors.mediumBlue,
  },
  hitsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  hitLabel: {
    fontSize: 18,
    color: Colors.Black,
    alignSelf: 'center',
  },
  hitValue: {
    fontWeight: 'bold',
    fontSize: 25,
    color: Colors.primaryColor,
  },
  emptyContainer: {
    flex: 3,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontWeight: 'bold',
    fontSize: 30,
    color: Colors.mediumBlue,
  },
  scanButton: {
    width: wp(96),
    marginVertical: 5,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 10,
    height: 50,
    backgroundColor: Colors.primaryColor,
  },
  scanButtonText: {
    fontSize: 30,
    color: Colors.White,
    fontWeight: 'bold',
    alignSelf: 'center',
    textTransform: 'uppercase',
  },
  loader: {
    marginVertical: 20,
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: 10,
  },
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
    height: heightScreen * 0.4,
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
    padding: 1,
  },
  modalTitle: {
    alignSelf: 'center',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Black,
  },
  alertText: {
    alignSelf: 'center',
    textAlign: 'center',
    fontSize: 18,
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
  cameraButtonContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  cameraButton: {
    width: wp(96),
    marginVertical: 5,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 10,
    height: 50,
    backgroundColor: Colors.primaryColor,
  },
  printIcon: {
    color: '#000',
  },
});
