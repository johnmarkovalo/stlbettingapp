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
import {palette} from '../../../theme/colors';
import {fontFamily, fontSize} from '../../../theme/typography';
import {spacing, borderRadius} from '../../../theme/spacing';
import {shadows} from '../../../theme/shadows';
import Icon from '../../../components/shared/Icon';
import Transaction from '../../../models/Transaction';
import {TransactionItem} from '../../../components/transactionItem';
import {checkInternetConnection, formatNumberWithCommas} from '../../../helper';
import TransactionBets from '../../../components/TransactionBets';
import DatePicker from 'react-native-date-picker';
import moment from 'moment';
import DrawModal from '../../../components/DrawModal';
import TypeModal from '../../../components/TypeModal';
import {useSelector} from 'react-redux';
import Type from '../../../models/Type';
import {printSales} from '../../../helper/printer';
import {
  historySyncManager,
  SyncProgress,
  SyncState,
} from '../../../services/historySyncManager';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Component
// ============================================================================

const widthScreen = Dimensions.get('window').width;

const History: React.FC<any> = ({navigation}) => {
  // Redux state
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const betTypes = useSelector((state: RootState) => state.types.types);
  const selectedType = useSelector(
    (state: RootState) => state.types.selectedType,
  );
  const selectedDraw = useSelector(
    (state: RootState) => state.types.selectedDraw,
  );

  // Local state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [refresh, setRefresh] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Modal state
  const [betModalVisible, setBetModalVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [drawModalVisible, setDrawModalVisible] = useState(false);
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<
    Transaction | undefined
  >(undefined);

  // Sync state
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);

  // Refs
  const internetStatusCheck = useRef(checkInternetConnection());
  const hasInitialSync = useRef(false);
  const prevDrawRef = useRef<number | undefined>();
  const prevTypeRef = useRef<number | undefined>();
  const lastFetchTime = useRef<number>(0);

  // Memoized values
  const minDate = useMemo(() => moment().subtract(1, 'weeks').toDate(), []);
  const maxDate = useMemo(() => moment().toDate(), []);
  const formattedDate = useMemo(
    () => moment(selectedDate).format('YYYY-MM-DD'),
    [selectedDate],
  );

  // ============================================================================
  // Callbacks
  // ============================================================================

  const typeLabel = useCallback(() => {
    const matchingItems = betTypes.filter(
      (item: Type) => item.bettypeid === selectedType,
    );
    return matchingItems.length > 0 ? matchingItems[0].name : null;
  }, [betTypes, selectedType]);

  const getSyncParams = useCallback(() => {
    return {
      token,
      date: formattedDate,
      draw: selectedDraw,
      type: selectedType,
      keycode: user.keycode,
    };
  }, [token, formattedDate, selectedDraw, selectedType, user.keycode]);

  /**
   * Load local data immediately (optimistic UI)
   */
  const loadLocalData = useCallback(async () => {
    try {
      const params = getSyncParams();
      const {transactions: localTrans, totalAmount: total} =
        await historySyncManager.getLocalTransactions(params);
      
      setTransactions(localTrans);
      setTotalAmount(total);
      setInitialLoading(false);
      
      console.log(`📊 [History] Loaded ${localTrans.length} local transactions`);
    } catch (error) {
      console.error('❌ [History] Error loading local data:', error);
      setTransactions([]);
      setTotalAmount(0);
      setInitialLoading(false);
    }
  }, [getSyncParams]);

  /**
   * Perform sync with server
   */
  const performSync = useCallback(async () => {
    // Check internet connection
    if (!internetStatusCheck.current.isConnected()) {
      console.log('📵 [History] No internet, showing local data only');
      await loadLocalData();
      return;
    }

    setRefresh(true);

    try {
      const params = getSyncParams();
      const result = await historySyncManager.requestSync(params);

      if (result.success || result.aborted) {
        setTransactions(result.transactions);
        setTotalAmount(result.totalAmount);
      }

      lastFetchTime.current = Date.now();
    } catch (error) {
      console.error('❌ [History] Sync error:', error);
      Alert.alert('Sync Error', 'Failed to sync transactions. Please try again.');
    } finally {
      setRefresh(false);
      setInitialLoading(false);
    }
  }, [getSyncParams, loadLocalData]);

  /**
   * Handle manual sync button press
   */
  const handleManualSync = useCallback(async () => {
    if (historySyncManager.isSyncing()) {
      console.log('🔄 [History] Sync already in progress');
      return;
    }

    if (!internetStatusCheck.current.isConnected()) {
      Alert.alert('Error', 'No internet connection');
      return;
    }

    await performSync();
  }, [performSync]);

  /**
   * Handle reconciliation (long press on sync button)
   * Checks synced transactions against server and fixes missing ones
   */
  const handleReconcile = useCallback(async () => {
    if (isReconciling || historySyncManager.isSyncing()) {
      return;
    }

    if (!internetStatusCheck.current.isConnected()) {
      Alert.alert('Error', 'No internet connection');
      return;
    }

    Alert.alert(
      'Reconcile Sync Status',
      'This will check all "synced" transactions against the server and fix any that are missing. Continue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reconcile',
          onPress: async () => {
            setIsReconciling(true);
            try {
              const result = await historySyncManager.reconcileSyncedTransactions(
                token,
                progress => {
                  console.log(`Reconcile progress: ${progress.checked}/${progress.total}`);
                },
              );

              if (result.missing > 0) {
                Alert.alert(
                  'Reconciliation Complete',
                  `Found ${result.missing} transactions missing from server.\nThey have been reset for re-sync.\n\nTap Sync to upload them now.`,
                );
              } else {
                Alert.alert(
                  'Reconciliation Complete',
                  `Checked ${result.checked} transactions.\nAll are properly synced to server.`,
                );
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to reconcile transactions');
            } finally {
              setIsReconciling(false);
            }
          },
        },
      ],
    );
  }, [isReconciling, token]);

  /**
   * Handle pull-to-refresh
   */
  const onRefresh = useCallback(async () => {
    setRefresh(true);
    await performSync();
  }, [performSync]);

  // ============================================================================
  // Modal Handlers
  // ============================================================================

  const betModalHide = useCallback(() => setBetModalVisible(false), []);
  const betModalShow = useCallback((transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setBetModalVisible(true);
  }, []);

  const drawModalHide = useCallback(() => setDrawModalVisible(false), []);
  const drawModalShow = useCallback(() => setDrawModalVisible(true), []);

  const typeModalHide = useCallback(() => setTypeModalVisible(false), []);
  const typeModalShow = useCallback(() => setTypeModalVisible(true), []);

  const dateModalHide = useCallback(() => setDateModalVisible(false), []);
  const dateModalShow = useCallback(() => setDateModalVisible(true), []);

  const handleDateConfirm = useCallback((date: Date) => {
    setDateModalVisible(false);
    setSelectedDate(date);
  }, []);

  const handlePrintSales = useCallback(() => {
    if (transactions.length > 0) {
      printSales(selectedDate, selectedDraw, typeLabel(), totalAmount, user);
    }
  }, [transactions.length, selectedDate, selectedDraw, typeLabel, totalAmount, user]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

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

  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Icon name="Receipt" size={60} color={palette.gray[400]} />
        <Text style={styles.emptyText}>No transactions found</Text>
        <Text style={styles.emptySubText}>
          Transactions will appear here after you place bets
        </Text>
      </View>
    ),
    [],
  );

  // ============================================================================
  // Effects
  // ============================================================================

  // Subscribe to sync manager progress updates
  useEffect(() => {
    const unsubscribe = historySyncManager.subscribe((progress: SyncProgress) => {
      setSyncState(progress.state);
      setSyncProgress(progress);
    });

    return unsubscribe;
  }, []);

  // Initial load: show local data immediately, then sync
  useEffect(() => {
    const initialize = async () => {
      if (!hasInitialSync.current) {
        // First: Load local data immediately (optimistic UI)
        await loadLocalData();
        
        // Then: Sync with server in background
        if (internetStatusCheck.current.isConnected()) {
          performSync();
        }
        
        hasInitialSync.current = true;
      }
    };

    initialize();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle draw/type changes
  useEffect(() => {
    if (hasInitialSync.current) {
      const drawChanged = prevDrawRef.current !== selectedDraw;
      const typeChanged = prevTypeRef.current !== selectedType;

      if (drawChanged || typeChanged) {
        console.log('🔄 [History] Parameters changed, reloading...');
        
        // Cancel any in-progress sync
        historySyncManager.cancel();
        
        // Load new data
        setInitialLoading(true);
        loadLocalData().then(() => {
          performSync();
        });
      }
    }

    prevDrawRef.current = selectedDraw;
    prevTypeRef.current = selectedType;
  }, [selectedDraw, selectedType, loadLocalData, performSync]);

  // Handle date changes
  useEffect(() => {
    if (hasInitialSync.current) {
      console.log('🔄 [History] Date changed, reloading...');
      
      historySyncManager.cancel();
      setInitialLoading(true);
      loadLocalData().then(() => {
        performSync();
      });
    }
  }, [formattedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle screen focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const timeSinceLastFetch = Date.now() - lastFetchTime.current;
      const shouldRefresh = timeSinceLastFetch > 30000; // 30 seconds

      if (shouldRefresh && hasInitialSync.current) {
        console.log('🔄 [History] Screen focused, refreshing stale data...');
        performSync();
      }
    });

    return unsubscribe;
  }, [navigation, performSync]);

  // ============================================================================
  // Derived State
  // ============================================================================

  const isSyncing = syncState !== 'idle' && 
                    syncState !== 'complete' && 
                    syncState !== 'error' && 
                    syncState !== 'cancelled';

  const showSyncProgress = isSyncing && syncProgress && syncProgress.total > 0;

  // ============================================================================
  // Render
  // ============================================================================

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
              onLongPress={handleReconcile}
              delayLongPress={800}
              style={styles.syncButton}
              disabled={isSyncing || isReconciling}>
              <Icon
                name={isReconciling ? 'ArrowsClockwise' : 'CloudArrowUp'}
                size={28}
                color={(isSyncing || isReconciling) ? palette.primary[300] : palette.primary[500]}
                weight="bold"
              />
              {(isSyncing || isReconciling) && (
                <View style={styles.syncIndicator}>
                  <ActivityIndicator size="small" color={palette.primary[500]} />
                </View>
              )}
            </TouchableOpacity>
            {transactions.length > 0 && (
              <TouchableOpacity onPress={handlePrintSales}>
                <Icon name="Printer" size={32} color={palette.primary[500]} weight="bold" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Cards */}
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <TouchableOpacity onPress={dateModalShow} style={styles.filterButton}>
              <Text style={styles.cardTitle}>DATE</Text>
              <Text style={styles.cardSubTitle}>
                {moment(selectedDate).format('MMM DD, YYYY')}
              </Text>
            </TouchableOpacity>

            <View style={styles.verticalLine} />

            <TouchableOpacity onPress={drawModalShow} style={styles.filterButton}>
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

            <TouchableOpacity onPress={typeModalShow} style={styles.filterButton}>
              <Text style={styles.cardTitle}>Type</Text>
              <Text style={styles.cardSubTitle}>{typeLabel()}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sync Progress Indicator */}
        {showSyncProgress && (
          <View style={styles.syncProgressContainer}>
            <View style={styles.syncProgressHeader}>
              <Icon name="ArrowsClockwise" size={16} color={palette.primary[500]} />
              <Text style={styles.syncProgressTitle}>
                {syncProgress?.message || 'Syncing...'}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(
                      (syncProgress!.processed / syncProgress!.total) * 100,
                    )}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {syncProgress?.processed} / {syncProgress?.total}
            </Text>
          </View>
        )}

        {/* Loading State */}
        {initialLoading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator style={styles.loader} />
            <Text style={styles.loaderText}>Loading transactions...</Text>
          </View>
        )}

        {/* Refresh Indicator */}
        {refresh && !initialLoading && (
          <View style={styles.refreshIndicator}>
            <ActivityIndicator size="small" color={palette.primary[500]} />
            <Text style={styles.refreshText}>Syncing with server...</Text>
          </View>
        )}

        {/* Total Amount */}
        {!initialLoading && (
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
            style={styles.list}
            contentContainerStyle={[
              styles.listContent,
              transactions.length === 0 && styles.listContentEmpty,
            ]}
            ListEmptyComponent={ListEmptyComponent}
            refreshControl={
              <RefreshControl
                refreshing={refresh}
                onRefresh={onRefresh}
                colors={[palette.primary[500]]}
                tintColor={palette.primary[500]}
              />
            }
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={10}
            getItemLayout={(_, index) => ({
              length: 80,
              offset: 80 * index,
              index,
            })}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  syncButton: {
    position: 'relative',
    padding: spacing[1],
  },
  syncIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing[4],
    marginTop: spacing[3],
    padding: spacing[4],
    borderWidth: 1,
    borderColor: palette.gray[200],
    ...shadows.sm,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  cardTitle: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semiBold,
    color: palette.gray[500],
    marginBottom: spacing[1],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardSubTitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    color: palette.primary[500],
  },
  verticalLine: {
    width: 1,
    height: 40,
    backgroundColor: palette.gray[200],
  },
  syncProgressContainer: {
    backgroundColor: palette.primary[50],
    marginHorizontal: spacing[4],
    marginTop: spacing[3],
    padding: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: palette.primary[200],
  },
  syncProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  syncProgressTitle: {
    marginLeft: spacing[2],
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: palette.primary[700],
  },
  progressBar: {
    height: 4,
    backgroundColor: palette.primary[100],
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing[1],
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.primary[500],
    borderRadius: 2,
  },
  progressText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
    color: palette.primary[600],
    textAlign: 'right',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    marginBottom: spacing[3],
  },
  loaderText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: palette.gray[500],
  },
  refreshIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    backgroundColor: palette.primary[50],
    marginHorizontal: spacing[4],
    marginTop: spacing[2],
    borderRadius: borderRadius.md,
  },
  refreshText: {
    marginLeft: spacing[2],
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
    color: palette.primary[600],
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing[4],
    marginVertical: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: palette.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: palette.gray[200],
    ...shadows.sm,
  },
  totalLabel: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    color: palette.gray[600],
  },
  totalAmount: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: palette.primary[500],
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[5],
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[10],
  },
  emptyText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.semiBold,
    color: palette.gray[700],
    marginTop: spacing[4],
  },
  emptySubText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: palette.gray[500],
    marginTop: spacing[2],
    textAlign: 'center',
  },
});

export default History;
