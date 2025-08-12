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

import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Styles from './Styles';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import Colors from '../../../Styles/Colors';
import Transaction from '../../../models/Transaction';
import {TransactionItem} from '../../../components/transactionItem';
import {
  checkInternetConnection,
  convertToBets,
  formatNumberWithCommas,
  getCurrentDraw,
} from '../../../helper';
import TransactionBets from '../../../components/TransactionBets';
import DatePicker from 'react-native-date-picker';
import moment from 'moment';
import DrawModal from '../../../components/DrawModal';
import TypeModal from '../../../components/TypeModal';
import {useSelector, useDispatch} from 'react-redux';
import {
  getTransactions,
  updateTransactionStatus,
  getBetsByTransaction,
  getLatestTransaction,
  insertTransaction,
} from '../../../database';
import Type from '../../../models/Type';
import {listPairedDevices, printSales} from '../../../helper/printer';
import {
  getTransactionsAPI,
  sendTransactionAPI,
  getTransactionViaTicketCodeAPI,
} from '../../../helper/api';

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

const History: React.FC<any> = ({navigation}) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const betTypes = useSelector((state: RootState) => state.types.types);
  const selectedType = useSelector(
    (state: RootState) => state.types.selectedType,
  );
  const selectedDraw = useSelector(
    (state: RootState) => state.types.selectedDraw,
  );

  const [refresh, setRefresh] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [betModalVisible, setBetModalVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [drawModalVisible, setDrawModalVisible] = useState(false);
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [totalAmount, setTotalAmount] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<
    Transaction | undefined
  >(undefined);

  const dispatch = useDispatch();
  // Refs
  const internetStatusCheck = useRef(checkInternetConnection());
  const hasInitialSync = useRef(false);
  const prevDrawRef = useRef<number | undefined>();
  const prevTypeRef = useRef<number | undefined>();

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

  const insertTransactionFromServer = useCallback(
    async (ticketcode: string) => {
      try {
        const transaction = await getTransactionViaTicketCodeAPI(
          token,
          ticketcode,
        );
        console.log('Transaction from server:', transaction);
        if (transaction) {
          console.log('Raw trans_data:', transaction.trans_data);
          const bets = convertToBets(transaction.trans_data);
          console.log('Converted bets:', bets);

          // Calculate total by summing target and rambol amounts from bets
          const calculatedTotal = bets.reduce((total, bet) => {
            // Convert string amounts to numbers, defaulting to 0 if invalid
            const targetAmount = Number(bet.targetAmount) || 0;
            const rambolAmount = Number(bet.rambolAmount) || 0;
            console.log(
              `Bet ${bet.betNumber}: target=${targetAmount}, rambol=${rambolAmount}, subtotal=${targetAmount + rambolAmount}`,
            );
            return total + targetAmount + rambolAmount;
          }, 0);

          console.log('Final calculated total:', calculatedTotal);

          console.log('Bets from trans_data:', bets);
          console.log('Calculated total:', calculatedTotal);

          const newTransaction = {
            ...transaction,
            status: 'synced',
            total: calculatedTotal, // Use calculated total instead of declared_gross
            created_at: moment(transaction.printed_at).format(
              'YYYY-MM-DD HH:mm:ss',
            ),
            bets: bets,
          };
          console.log('Transaction from server:', transaction);
          await insertTransaction(newTransaction, bets);
        }
      } catch (error) {
        console.error('Error inserting transaction from server:', error);
      }
    },
    [token],
  );

  const resendTransaction = useCallback(
    async (transaction: Transaction) => {
      try {
        if (internetStatusCheck.current.isConnected()) {
          if (transaction.id) {
            const bets = await getBetsByTransaction(transaction.id);
            // Ensure bets is an array and calculate total safely
            let total = 0;
            if (Array.isArray(bets)) {
              total = bets.reduce((sum, bet: any) => {
                const targetAmount = Number(bet.targetAmount) || 0;
                const rambolAmount = Number(bet.rambolAmount) || 0;
                return sum + targetAmount + rambolAmount;
              }, 0);
            }
            if (Array.isArray(bets)) {
              let newTransaction = {
                ...transaction,
                status: 'VALID',
                gateway: 'Retrofit',
                keycode: user.keycode,
                remarks: '',
                printed_at: transaction.created_at,
                declared_gross: total,
                bets: bets,
              };
              const response = await sendTransactionAPI(token, newTransaction);
              if (response) {
                return true;
              }
            }
          }
        } else {
          Alert.alert('No internet connection');
        }
        return false;
      } catch (error) {
        console.error('Error in resendTransaction:', error);
        return false;
      }
    },
    [user.keycode, totalAmount, token],
  );

  const syncTransactions = useCallback(async () => {
    if (syncing) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    setSyncing(true);
    setRefresh(true);
    try {
      if (!internetStatusCheck.current.isConnected()) {
        Alert.alert('Error', 'No internet connection');
        return;
      }

      const serverTransactions = await getTransactionsAPI(
        token,
        formattedDate,
        selectedDraw,
        selectedType,
        user.keycode,
      );

      // Step 1: Convert server transactions to a Set for quick lookup
      const serverTransactionSet = new Set(serverTransactions);

      // Step 2: Find and resend local transactions that are not on the server
      const currentTransactions = await getTransactions(
        formattedDate,
        selectedDraw,
        selectedType,
      );

      if (Array.isArray(currentTransactions)) {
        currentTransactions.forEach(transaction => {
          if (!serverTransactionSet.has(transaction.ticketcode)) {
            console.log(
              'This transaction does not exist on the server:',
              transaction,
            );
            resendTransaction(transaction);
            if (transaction.id) {
              updateTransactionStatus(transaction.id, 'synced');
            }
          }
        });

        // Step 3: Find and insert server transactions that are missing locally
        const localTransactionSet = new Set(
          currentTransactions.map(t => t.ticketcode),
        );

        serverTransactions.forEach((serverTicketCode: any) => {
          if (!localTransactionSet.has(serverTicketCode)) {
            console.log(
              'Inserting missing transaction from server:',
              serverTicketCode,
            );
            insertTransactionFromServer(serverTicketCode);
          }
        });
      }
    } catch (error) {
      console.error('Error syncing transactions:', error);
    } finally {
      setRefresh(false);
      setSyncing(false);
    }
  }, [
    token,
    formattedDate,
    selectedDraw,
    selectedType,
    user.keycode,
    resendTransaction,
    insertTransactionFromServer,
    syncing,
  ]);

  const fetchData = useCallback(async () => {
    setRefresh(true);

    try {
      // Validate parameters before making the call
      if (selectedDraw === undefined || selectedType === undefined) {
        console.warn('⚠️ History fetchData - Missing parameters:', {
          draw: selectedDraw,
          type: selectedType,
        });
        setTransactions([]);
        setTotalAmount(0);
        setInitialLoading(false);
        return;
      }

      console.log('🔄 History fetchData - Params:', {
        date: formattedDate,
        draw: selectedDraw,
        type: selectedType,
        typeName: typeLabel(),
      });

      // Always sync with server first
      if (internetStatusCheck.current.isConnected()) {
        console.log('🔄 History fetchData - Syncing with server first...');
        setSyncing(true);
        await syncTransactions();
        setSyncing(false);
      }

      const fetchedTransactions = await getTransactions(
        formattedDate,
        selectedDraw,
        selectedType,
      );

      console.log('📊 History fetchData - Results:', {
        count: Array.isArray(fetchedTransactions)
          ? fetchedTransactions.length
          : 0,
        transactions: fetchedTransactions,
      });

      if (Array.isArray(fetchedTransactions)) {
        setTransactions(fetchedTransactions);
        const total = fetchedTransactions.reduce(
          (sum, item) => sum + (item.total || 0),
          0,
        );
        setTotalAmount(total);
      } else {
        setTransactions([]);
        setTotalAmount(0);
      }

      setInitialLoading(false);
    } catch (error) {
      console.error('❌ History fetchData error:', error);
      setTransactions([]);
      setTotalAmount(0);
      setInitialLoading(false);
    } finally {
      setRefresh(false);
    }
  }, [formattedDate, selectedDraw, selectedType, typeLabel, syncTransactions]);

  const onRefresh = useCallback(async () => {
    setRefresh(true);
    try {
      // Sync with server first, then fetch data
      await fetchData();
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setTimeout(() => {
        setRefresh(false);
      }, 1000);
    }
  }, [fetchData]);

  const handleManualSync = useCallback(async () => {
    if (syncing) {
      console.log('Sync already in progress...');
      return;
    }

    if (!internetStatusCheck.current.isConnected()) {
      Alert.alert('Error', 'No internet connection');
      return;
    }

    // fetchData now includes sync, so just call it
    await fetchData();
  }, [fetchData, syncing]);

  // Modal handlers
  const betModalHide = useCallback(() => {
    setBetModalVisible(false);
  }, []);

  const betModalShow = useCallback((transaction: Transaction) => {
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

  const handlePrintSales = useCallback(() => {
    if (transactions.length > 0) {
      listPairedDevices();
      printSales(selectedDate, selectedDraw, typeLabel(), totalAmount, user);
    }
  }, [
    transactions.length,
    selectedDate,
    selectedDraw,
    typeLabel,
    totalAmount,
    user,
  ]);

  // Render functions
  const renderItem = useCallback(
    ({item}: {item: Transaction}) => (
      <TransactionItem
        key={item.id || item.ticketcode}
        item={item}
        onPress={() => betModalShow(item)}
      />
    ),
    [betModalShow],
  );

  const keyExtractor = useCallback(
    (item: Transaction) => item.id?.toString() || item.ticketcode,
    [],
  );

  // Effects
  useEffect(() => {
    const initializeScreen = async () => {
      if (!hasInitialSync.current) {
        // First time: sync then fetch
        await fetchData();
        hasInitialSync.current = true;
      }
    };

    initializeScreen();
  }, [fetchData]);

  // Watch for changes in selectedDraw and selectedType
  useEffect(() => {
    if (hasInitialSync.current) {
      // Only fetch if values actually changed
      const drawChanged = prevDrawRef.current !== selectedDraw;
      const typeChanged = prevTypeRef.current !== selectedType;

      if (drawChanged || typeChanged) {
        console.log('🔄 History - Draw or Type changed, fetching new data...');
        console.log(
          'Previous draw:',
          prevDrawRef.current,
          'New draw:',
          selectedDraw,
        );
        console.log(
          'Previous type:',
          prevTypeRef.current,
          'New type:',
          selectedType,
        );

        // Update refs
        prevDrawRef.current = selectedDraw;
        prevTypeRef.current = selectedType;

        // Fetch new data
        fetchData();
      }
    } else {
      // First time, just store the values
      prevDrawRef.current = selectedDraw;
      prevTypeRef.current = selectedType;
    }
  }, [selectedDraw, selectedType]); // No fetchData dependency to avoid infinite loop

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation, fetchData]);

  return (
    <SafeAreaView style={Styles.backgroundWrapper}>
      {/* Modals */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={betModalVisible}
        onRequestClose={betModalHide}>
        <TransactionBets
          hide={betModalHide}
          transaction={
            selectedTransaction
              ? {
                  id: selectedTransaction.id || 0,
                  ticketcode: selectedTransaction.ticketcode,
                }
              : {id: 0, ticketcode: ''}
          }
        />
      </Modal>

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

      <Modal
        animationType="fade"
        transparent={true}
        visible={drawModalVisible}
        onRequestClose={drawModalHide}>
        <DrawModal hide={drawModalHide} />
      </Modal>

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
          <Text style={Styles.logoText}>{'History'}</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={handleManualSync}
              style={styles.syncButton}
              disabled={syncing}>
              <MaterialIcon
                name="sync"
                size={30}
                style={[styles.syncIcon, syncing && {opacity: 0.5}]}
              />
              {syncing && (
                <View style={styles.syncIndicator}>
                  <ActivityIndicator size="small" color={Colors.primaryColor} />
                </View>
              )}
            </TouchableOpacity>
            {transactions.length > 0 && (
              <TouchableOpacity onPress={handlePrintSales}>
                <MaterialIcon name="print" size={40} style={styles.printIcon} />
              </TouchableOpacity>
            )}
          </View>
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

        {/* Total Amount */}
        {initialLoading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator style={styles.loader} />
            <Text style={styles.loaderText}>Initializing and syncing...</Text>
          </View>
        )}
        {refresh && !initialLoading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator style={styles.loader} />
            <Text style={styles.loaderText}>
              {syncing ? 'Syncing with server...' : 'Loading...'}
            </Text>
          </View>
        )}
        {!refresh && !initialLoading && (
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalAmount}>
              {formatNumberWithCommas(totalAmount)}
            </Text>
          </View>
        )}

        {/* Transaction List */}
        {!initialLoading && (
          <FlatList
            data={transactions}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            refreshControl={
              <RefreshControl
                refreshing={refresh && !syncing}
                onRefresh={onRefresh}
                colors={[Colors.primaryColor]}
                tintColor={Colors.primaryColor}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No transactions found</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

History.displayName = 'History';

export default React.memo(History);

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
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  totalLabel: {
    fontSize: 20,
    color: Colors.Black,
    marginRight: 5,
  },
  totalAmount: {
    fontWeight: 'bold',
    fontSize: 30,
    color: Colors.mediumGreen,
  },
  loader: {
    marginVertical: 20,
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.darkGrey,
    textAlign: 'center',
  },
  printIcon: {
    color: '#000',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncButton: {
    marginRight: 10,
  },
  syncIcon: {
    color: Colors.primaryColor,
  },
  loaderContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loaderText: {
    marginLeft: 10,
    fontSize: 16,
    color: Colors.darkGrey,
  },
  syncIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
  },
});
