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
  getUnsyncedTransactionsCount,
  getUnsyncedTransactionsBatch,
  updateTransactionStatusBatch,
  getTransactionByTicketCode,
} from '../../../database';
import Type from '../../../models/Type';
import {printSales} from '../../../helper/printer';
import {
  getTransactionsAPI,
  sendTransactionAPI,
  getTransactionViaTicketCodeAPI,
  getTransactionsBulkAPI,
  sendTransactionsBulkAPI,
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

// API response interface for server transactions
interface ServerTransaction {
  id?: number;
  ticketcode: string;
  trans_data: string;
  betdate: string;
  bettime: number;
  bettypeid: number;
  printed_at: string;
  trans_no?: number;
  total?: number;
  status?: string;
  [key: string]: any; // Allow additional properties
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

  // Batch sync progress tracking
  const [batchSyncProgress, setBatchSyncProgress] = useState({
    isActive: false,
    currentBatch: 0,
    totalBatches: 0,
    processedCount: 0,
    totalCount: 0,
    successCount: 0,
    failedCount: 0,
  });

  const dispatch = useDispatch();
  // Refs
  const internetStatusCheck = useRef(checkInternetConnection());
  const hasInitialSync = useRef(false);
  const prevDrawRef = useRef<number | undefined>();
  const prevTypeRef = useRef<number | undefined>();
  const lastFetchTime = useRef<number | undefined>();
  const lastFetchCallTime = useRef<number | undefined>();
  const isSyncingRef = useRef(false);

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
        const transaction = (await getTransactionViaTicketCodeAPI(
          token,
          ticketcode,
        )) as unknown as ServerTransaction;
        console.log('Transaction from server:', transaction);
        if (transaction) {
          console.log('Raw trans_data:', transaction.trans_data);
          const bets = convertToBets(transaction.trans_data);
          console.log('Converted bets:', bets);

          // Calculate total by summing target and rambol amounts from bets
          const calculatedTotal = bets.reduce((total: number, bet: any) => {
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
            trans_data: transaction.trans_data, // Ensure trans_data is included
            trans_no: transaction.trans_no || 1, // Ensure trans_no is included
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
    if (syncing || isSyncingRef.current) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    isSyncingRef.current = true;
    setSyncing(true);
    setRefresh(true);

    try {
      if (!internetStatusCheck.current.isConnected()) {
        Alert.alert('Error', 'No internet connection');
        isSyncingRef.current = false;
        setRefresh(false);
        setSyncing(false);
        return;
      }

      // Check how many unsynced transactions we have
      const unsyncedCount = await getUnsyncedTransactionsCount(
        formattedDate,
        selectedDraw,
        selectedType,
      );

      console.log(`🔄 Sync - Found ${unsyncedCount} unsynced transactions`);

      // If we have 50+ unsynced items, use batch processing
      if (unsyncedCount >= 50) {
        console.log(
          '📦 Sync - Using batch processing for large number of transactions',
        );
        await syncTransactionsBatch(unsyncedCount);
      } else {
        console.log(
          '📤 Sync - Using individual processing for small number of transactions',
        );
        await syncTransactionsIndividual();
      }
    } catch (error) {
      console.error('Error syncing transactions:', error);
      Alert.alert(
        'Sync Error',
        'Failed to sync transactions. Please try again.',
      );
    } finally {
      isSyncingRef.current = false;
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

  // Helper function to process API calls in parallel with concurrency limit
  const processInBatchesWithConcurrency = async <T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    concurrency: number = 5,
  ): Promise<R[]> => {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(item => processor(item)),
      );
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      });
      // Small delay between concurrent batches to avoid overwhelming server
      if (i + concurrency < items.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    return results;
  };

  // Batch syncing for 50+ unsynced transactions
  const syncTransactionsBatch = useCallback(
    async (totalUnsynced: number) => {
      const BATCH_SIZE = 20; // Fetch 20 transactions at a time from DB
      const CONCURRENCY_LIMIT = 5; // Process max 5 API calls simultaneously
      const totalBatches = Math.ceil(totalUnsynced / BATCH_SIZE);

      // Initialize progress tracking
      setBatchSyncProgress({
        isActive: true,
        currentBatch: 0,
        totalBatches,
        processedCount: 0,
        totalCount: totalUnsynced,
        successCount: 0,
        failedCount: 0,
      });

      console.log(
        `📦 Batch Sync - Processing ${totalUnsynced} transactions in ${totalBatches} batches`,
      );

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const offset = batchIndex * BATCH_SIZE;
        const currentBatchSize = Math.min(BATCH_SIZE, totalUnsynced - offset);

        // Update progress
        setBatchSyncProgress(prev => ({
          ...prev,
          currentBatch: batchIndex + 1,
        }));

        console.log(
          `📦 Batch ${batchIndex + 1}/${totalBatches} - Processing ${currentBatchSize} transactions (offset: ${offset})`,
        );

        try {
          // Get batch of unsynced transactions
          const batchTransactions = await getUnsyncedTransactionsBatch(
            formattedDate,
            selectedDraw,
            selectedType,
            currentBatchSize,
            offset,
          );

          if (batchTransactions.length === 0) {
            console.log(
              `📦 Batch ${batchIndex + 1} - No transactions to process`,
            );
            continue;
          }

          // Use bulk API if we have many transactions, otherwise use individual requests
          let batchResults: Array<{
            success: boolean;
            ticketcode: string;
            error?: string;
          }> = [];

          if (batchTransactions.length >= 50) {
            // Use bulk API for large batches
            console.log(
              `📤 Batch ${batchIndex + 1} - Using bulk API for ${batchTransactions.length} transactions`,
            );
            try {
              // Prepare all transaction data
              const transactionsToSync = await Promise.all(
                batchTransactions.map(async transaction => {
                  const bets = await getBetsByTransaction(transaction.id);
                  return {
                    ticketcode: transaction.ticketcode,
                    trans_data: transaction.trans_data || convertToBets(bets),
                    betdate: transaction.betdate,
                    bettime: transaction.bettime,
                    bettypeid: transaction.bettypeid,
                    total: transaction.total,
                    status: transaction.status,
                    created_at: transaction.created_at,
                    trans_no: transaction.trans_no || 1,
                    gateway: 'Retrofit',
                    bets: Array.isArray(bets)
                      ? bets.map((bet: any) => ({
                          betNumber: bet.betNumber || bet.betnumber || '',
                          betNumberr: bet.betNumberr || bet.betnumberr || '',
                          targetAmount: bet.targetAmount || bet.target || 0,
                          rambolAmount: bet.rambolAmount || bet.rambol || 0,
                          subtotal: bet.subtotal || 0,
                        }))
                      : [],
                  };
                }),
              );

              // Send bulk request
              const bulkResponse = await sendTransactionsBulkAPI(
                token,
                transactionsToSync,
              );

              if (bulkResponse && bulkResponse.results) {
                batchResults = bulkResponse.results.map(result => ({
                  success: result.success,
                  ticketcode: result.ticketcode,
                  error: result.error,
                }));
                console.log(
                  `✅ Batch ${batchIndex + 1} - Bulk sync completed: ${batchResults.filter(r => r.success).length} successful, ${batchResults.filter(r => !r.success).length} failed`,
                );
              } else {
                throw new Error('Invalid bulk response');
              }
            } catch (bulkError) {
              console.error(
                `❌ Batch ${batchIndex + 1} - Bulk API failed, falling back to individual requests:`,
                bulkError,
              );
              // Fallback to individual requests
              batchResults = await processInBatchesWithConcurrency(
                batchTransactions,
                async transaction => {
                  try {
                    const bets = await getBetsByTransaction(transaction.id);
                    const transactionData = {
                      ticketcode: transaction.ticketcode,
                      trans_data: transaction.trans_data || convertToBets(bets),
                      betdate: transaction.betdate,
                      bettime: transaction.bettime,
                      bettypeid: transaction.bettypeid,
                      total: transaction.total,
                      status: transaction.status,
                      created_at: transaction.created_at,
                    };

                    const serverResponse = await sendTransactionAPI(
                      token,
                      transactionData,
                    );

                    if (serverResponse && serverResponse.success) {
                      return {
                        success: true,
                        ticketcode: transaction.ticketcode,
                      };
                    } else {
                      return {
                        success: false,
                        ticketcode: transaction.ticketcode,
                        error: 'Server response error',
                      };
                    }
                  } catch (error) {
                    return {
                      success: false,
                      ticketcode: transaction.ticketcode,
                      error: (error as any)?.message || 'Unknown error',
                    };
                  }
                },
                CONCURRENCY_LIMIT,
              );
            }
          } else {
            // Use individual requests for smaller batches
            batchResults = await processInBatchesWithConcurrency(
              batchTransactions,
              async transaction => {
                try {
                  const bets = await getBetsByTransaction(transaction.id);
                  const transactionData = {
                    ticketcode: transaction.ticketcode,
                    trans_data: transaction.trans_data || convertToBets(bets),
                    betdate: transaction.betdate,
                    bettime: transaction.bettime,
                    bettypeid: transaction.bettypeid,
                    total: transaction.total,
                    status: transaction.status,
                    created_at: transaction.created_at,
                  };

                  const serverResponse = await sendTransactionAPI(
                    token,
                    transactionData,
                  );

                  if (serverResponse && serverResponse.success) {
                    console.log(
                      `✅ Batch ${batchIndex + 1} - Transaction ${transaction.ticketcode} synced successfully`,
                    );
                    return {success: true, ticketcode: transaction.ticketcode};
                  } else {
                    console.log(
                      `❌ Batch ${batchIndex + 1} - Transaction ${transaction.ticketcode} failed to sync`,
                    );
                    return {
                      success: false,
                      ticketcode: transaction.ticketcode,
                      error: 'Server response error',
                    };
                  }
                } catch (error) {
                  console.error(
                    `❌ Batch ${batchIndex + 1} - Error processing transaction ${transaction.ticketcode}:`,
                    error,
                  );
                  return {
                    success: false,
                    ticketcode: transaction.ticketcode,
                    error: (error as any)?.message || 'Unknown error',
                  };
                }
              },
              CONCURRENCY_LIMIT,
            );
          }

          // Process batch results (results are already unwrapped from processInBatchesWithConcurrency)
          const successfulSyncs: string[] = [];
          const failedSyncs: string[] = [];

          batchResults.forEach(result => {
            if (result && result.success) {
              successfulSyncs.push(result.ticketcode);
            } else {
              failedSyncs.push(result?.ticketcode || 'unknown');
            }
          });

          // Update progress counts
          setBatchSyncProgress(prev => ({
            ...prev,
            processedCount: prev.processedCount + batchTransactions.length,
            successCount: prev.successCount + successfulSyncs.length,
            failedCount: prev.failedCount + failedSyncs.length,
          }));

          // Update status for successful syncs
          if (successfulSyncs.length > 0) {
            await updateTransactionStatusBatch(successfulSyncs, 'synced');
            console.log(
              `✅ Batch ${batchIndex + 1} - Updated ${successfulSyncs.length} transactions to 'synced'`,
            );
          }

          // Log failed syncs for manual review
          if (failedSyncs.length > 0) {
            console.log(
              `⚠️ Batch ${batchIndex + 1} - ${failedSyncs.length} transactions failed to sync:`,
              failedSyncs,
            );
          }

          // Add small delay between batches to avoid overwhelming the server
          if (batchIndex < totalBatches - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (batchError) {
          console.error(
            `❌ Batch ${batchIndex + 1} - Batch processing error:`,
            batchError,
          );
          // Continue with next batch instead of failing completely
        }
      }

      // Reset progress tracking
      setBatchSyncProgress({
        isActive: false,
        currentBatch: 0,
        totalBatches: 0,
        processedCount: 0,
        totalCount: 0,
        successCount: 0,
        failedCount: 0,
      });

      console.log('📦 Batch Sync - Completed processing all batches');
    },
    [token, formattedDate, selectedDraw, selectedType, resendTransaction],
  );

  // Individual syncing for <50 unsynced transactions (original logic)
  const syncTransactionsIndividual = useCallback(async () => {
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
  }, [
    token,
    formattedDate,
    selectedDraw,
    selectedType,
    user.keycode,
    resendTransaction,
    insertTransactionFromServer,
  ]);

  // Helper function to process API calls in parallel with concurrency limit
  const processInBatches = async <T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = 5,
  ): Promise<R[]> => {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(item => processor(item)),
      );
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      });
    }
    return results;
  };

  // Full sync flow: Fetch from server → Save missing → Sync unsynced → Show all
  const performFullSync = useCallback(async () => {
    if (syncing) {
      console.log('🔄 Full sync already in progress, skipping...');
      return;
    }

    setSyncing(true);
    setRefresh(true);
    setInitialLoading(true);

    try {
      console.log('🚀 Starting optimized full sync flow...');

      let allTransactions: any[] = [];

      if (!internetStatusCheck.current.isConnected()) {
        // No internet - just show local data
        console.log('📥 No internet - showing local transactions only');
        const localTransactions = await getTransactions(
          formattedDate,
          selectedDraw,
          selectedType,
        );
        allTransactions = Array.isArray(localTransactions)
          ? localTransactions
          : [];
        setTransactions(allTransactions);
        setTotalAmount(
          allTransactions.reduce((sum, item) => sum + (item.total || 0), 0),
        );
        setInitialLoading(false);
        setSyncing(false);
        setRefresh(false);
        return;
      }

      // Step 1: Fetch server transactions
      console.log('📥 Step 1: Fetching transactions from server...');
      const serverResponse = await getTransactionsAPI(
        token,
        formattedDate,
        selectedDraw,
        selectedType,
        user.keycode,
      );

      // Parse server response
      let serverTransactions: any[] = [];
      let isTicketcodeOnlyResponse = false;

      if (serverResponse && Array.isArray(serverResponse)) {
        if (
          serverResponse.length > 0 &&
          typeof serverResponse[0] === 'string'
        ) {
          isTicketcodeOnlyResponse = true;
          serverTransactions = serverResponse;
        } else {
          serverTransactions = serverResponse;
        }
      } else if (serverResponse && (serverResponse as any).transactions) {
        serverTransactions = (serverResponse as any).transactions || [];
      } else if (serverResponse && (serverResponse as any).data) {
        serverTransactions = (serverResponse as any).data || [];
      }

      console.log(
        `📥 Found ${serverTransactions.length} server transactions (ticketcode-only: ${isTicketcodeOnlyResponse})`,
      );

      // Step 2: Get all local ticketcodes in ONE query (optimization)
      console.log('🔍 Step 2: Getting local ticketcodes for comparison...');
      const localTransactions = await getTransactions(
        formattedDate,
        selectedDraw,
        selectedType,
      );
      const localTicketcodeSet = new Set(
        (Array.isArray(localTransactions) ? localTransactions : []).map(
          (t: any) => t.ticketcode,
        ),
      );
      console.log(`🔍 Found ${localTicketcodeSet.size} local transactions`);

      // Step 3: If ticketcode-only response, fetch full details
      let validServerTransactions: any[] = [];
      if (isTicketcodeOnlyResponse && serverTransactions.length > 0) {
        // Filter missing ticketcodes in memory (much faster)
        const missingTicketcodes = serverTransactions.filter(
          (tc: string) => typeof tc === 'string' && !localTicketcodeSet.has(tc),
        );
        console.log(
          `📥 Found ${missingTicketcodes.length} missing ticketcodes (out of ${serverTransactions.length} total)`,
        );

        if (missingTicketcodes.length > 0) {
          // Use bulk API if available and we have many transactions (100+)
          // Otherwise fall back to individual requests for smaller batches
          if (missingTicketcodes.length >= 100) {
            console.log(
              `📥 Using bulk API to fetch ${missingTicketcodes.length} transactions...`,
            );
            try {
              // Split into chunks of 500 to avoid payload size limits
              const BULK_CHUNK_SIZE = 500;
              const allTransactions: any[] = [];

              for (
                let i = 0;
                i < missingTicketcodes.length;
                i += BULK_CHUNK_SIZE
              ) {
                const chunk = missingTicketcodes.slice(i, i + BULK_CHUNK_SIZE);
                console.log(
                  `📥 Fetching bulk chunk ${Math.floor(i / BULK_CHUNK_SIZE) + 1} (${chunk.length} transactions)...`,
                );
                const chunkTransactions = await getTransactionsBulkAPI(
                  token,
                  chunk,
                );
                if (Array.isArray(chunkTransactions)) {
                  allTransactions.push(...chunkTransactions);
                }
                // Small delay between chunks to avoid overwhelming server
                if (i + BULK_CHUNK_SIZE < missingTicketcodes.length) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              }

              validServerTransactions = allTransactions.filter(
                (t: any) =>
                  t && t.ticketcode && typeof t.ticketcode === 'string',
              );
              console.log(
                `✅ Fetched ${validServerTransactions.length} full transaction details via bulk API`,
              );
            } catch (bulkError) {
              console.error(
                '❌ Bulk API failed, falling back to individual requests:',
                bulkError,
              );
              // Fallback to individual requests
              const fullTransactions = await processInBatches(
                missingTicketcodes,
                async (ticketcode: string) => {
                  try {
                    const fullTransaction =
                      await getTransactionViaTicketCodeAPI(token, ticketcode);
                    return fullTransaction && fullTransaction.ticketcode
                      ? fullTransaction
                      : null;
                  } catch (error) {
                    console.error(`❌ Error fetching ${ticketcode}:`, error);
                    return null;
                  }
                },
                3, // Reduced concurrency for fallback
              );
              validServerTransactions = fullTransactions.filter(
                t => t !== null,
              );
            }
          } else {
            // For smaller batches, use individual requests
            console.log(
              '📥 Fetching full transaction details in parallel (small batch)...',
            );
            const fullTransactions = await processInBatches(
              missingTicketcodes,
              async (ticketcode: string) => {
                try {
                  const fullTransaction = await getTransactionViaTicketCodeAPI(
                    token,
                    ticketcode,
                  );
                  return fullTransaction && fullTransaction.ticketcode
                    ? fullTransaction
                    : null;
                } catch (error) {
                  console.error(`❌ Error fetching ${ticketcode}:`, error);
                  return null;
                }
              },
              5, // Process 5 at a time
            );
            validServerTransactions = fullTransactions.filter(t => t !== null);
            console.log(
              `✅ Fetched ${validServerTransactions.length} full transaction details`,
            );
          }
        }
      } else {
        // Already have full transaction objects
        validServerTransactions = serverTransactions.filter(
          (t: any) => t && t.ticketcode && typeof t.ticketcode === 'string',
        );
      }

      // Step 4: Save missing transactions in parallel (optimization)
      if (validServerTransactions.length > 0) {
        console.log('💾 Step 4: Saving missing transactions in parallel...');
        const transactionsToSave = validServerTransactions.filter(
          (serverTx: any) => !localTicketcodeSet.has(serverTx.ticketcode),
        );

        if (transactionsToSave.length > 0) {
          const saveResults = await processInBatches(
            transactionsToSave,
            async (serverTransaction: any) => {
              try {
                const serverTx = serverTransaction as any;

                // Validate required properties
                if (
                  !serverTx.trans_data ||
                  typeof serverTx.trans_data !== 'string' ||
                  !serverTx.printed_at
                ) {
                  return {success: false, ticketcode: serverTx.ticketcode};
                }

                const bets = convertToBets(serverTx.trans_data);
                if (!Array.isArray(bets) || bets.length === 0) {
                  return {success: false, ticketcode: serverTx.ticketcode};
                }

                const newTransaction = {
                  ...serverTransaction,
                  status: 'synced',
                  total: bets.reduce(
                    (sum, bet) => sum + (bet.targetAmount + bet.rambolAmount),
                    0,
                  ),
                  created_at: moment(serverTx.printed_at).format(
                    'YYYY-MM-DD HH:mm:ss',
                  ),
                  bets: bets,
                  trans_data: serverTx.trans_data,
                  trans_no: serverTx.trans_no || 1,
                } as any;

                await insertTransaction(newTransaction, bets);
                return {success: true, ticketcode: serverTx.ticketcode};
              } catch (error) {
                console.error(
                  `❌ Error saving ${serverTransaction.ticketcode}:`,
                  error,
                );
                return {
                  success: false,
                  ticketcode: serverTransaction.ticketcode,
                };
              }
            },
            3, // Process 3 at a time (DB writes are slower)
          );

          const savedCount = saveResults.filter(r => r.success).length;
          console.log(
            `💾 Saved ${savedCount} out of ${transactionsToSave.length} missing transactions`,
          );
        }
      }

      // Step 5: Sync unsynced transactions to server (background)
      console.log('📤 Step 5: Syncing unsynced transactions...');
      if (internetStatusCheck.current.isConnected()) {
        // Check if sync is already running to avoid conflicts
        if (!isSyncingRef.current) {
          // Don't await - let it run in background
          syncTransactions().catch(error => {
            console.error('❌ Error in background sync:', error);
          });
        } else {
          console.log('📤 Sync already in progress, skipping background sync');
        }
      }

      // Step 6: Fetch and display all transactions
      console.log('📊 Step 6: Fetching all transactions for display...');
      await new Promise(resolve => setTimeout(resolve, 300)); // Brief delay for DB writes

      const finalTransactions = await getTransactions(
        formattedDate,
        selectedDraw,
        selectedType,
      );
      allTransactions = Array.isArray(finalTransactions)
        ? finalTransactions
        : [];

      const total = allTransactions.reduce(
        (sum, item) => sum + (item.total || 0),
        0,
      );

      setTransactions(allTransactions);
      setTotalAmount(total);
      setInitialLoading(false);

      console.log(
        `✅ Sync complete: ${allTransactions.length} transactions, total: ${total}`,
      );
    } catch (error) {
      console.error('❌ Full sync flow error:', error);
      setTransactions([]);
      setTotalAmount(0);
      setInitialLoading(false);
    } finally {
      setSyncing(false);
      setRefresh(false);
    }
  }, [
    token,
    formattedDate,
    selectedDraw,
    selectedType,
    user.keycode,
    syncTransactions,
  ]);

  // Simplified fetchData that just shows local transactions
  const fetchData = useCallback(async () => {
    // Debounce rapid successive calls
    const now = Date.now();
    if (lastFetchCallTime.current && now - lastFetchCallTime.current < 1000) {
      console.log('🔄 History fetchData - Debounced rapid call');
      return;
    }
    lastFetchCallTime.current = now;

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

      console.log('🔄 History fetchData - Fetching local transactions...');

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
  }, [formattedDate, selectedDraw, selectedType]);

  const onRefresh = useCallback(async () => {
    setRefresh(true);
    try {
      // Sync with server first, then fetch data
      await performFullSync();
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setTimeout(() => {
        setRefresh(false);
      }, 1000);
    }
  }, [performFullSync]);

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
    await performFullSync();
  }, [performFullSync, syncing]);

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
        await performFullSync();
        hasInitialSync.current = true;
      }
    };

    initializeScreen();
  }, []); // Remove fetchData dependency to prevent infinite loops

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
        performFullSync();
      }
    } else {
      // First time, just store the values
      prevDrawRef.current = selectedDraw;
      prevTypeRef.current = selectedType;
    }
  }, [selectedDraw, selectedType, performFullSync]); // Add fetchData dependency

  // Navigation focus effect - only fetch if data is stale
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Only fetch if we haven't fetched recently or if parameters changed
      const timeSinceLastFetch = Date.now() - (lastFetchTime.current || 0);
      const shouldFetch = timeSinceLastFetch > 30000; // 30 seconds threshold

      if (shouldFetch) {
        console.log(
          '🔄 History - Screen focused, fetching data (stale data)...',
        );
        performFullSync();
        lastFetchTime.current = Date.now();
      } else {
        console.log(
          '🔄 History - Screen focused, data is fresh, skipping fetch',
        );
      }
    });
    return unsubscribe;
  }, [navigation, performFullSync]);

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

        {/* Batch Sync Progress Indicator */}
        {batchSyncProgress.isActive && (
          <View style={styles.batchSyncContainer}>
            <View style={styles.batchSyncHeader}>
              <MaterialIcon name="sync" size={20} color={Colors.primaryColor} />
              <Text style={styles.batchSyncTitle}>
                Batch Syncing Transactions
              </Text>
            </View>

            <View style={styles.batchSyncProgress}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(batchSyncProgress.processedCount / batchSyncProgress.totalCount) * 100}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.progressStats}>
                <Text style={styles.progressText}>
                  Batch {batchSyncProgress.currentBatch} of{' '}
                  {batchSyncProgress.totalBatches}
                </Text>
                <Text style={styles.progressText}>
                  {batchSyncProgress.processedCount} /{' '}
                  {batchSyncProgress.totalCount} processed
                </Text>
              </View>

              <View style={styles.progressResults}>
                <Text
                  style={[styles.progressText, {color: Colors.primaryColor}]}>
                  ✅ {batchSyncProgress.successCount} successful
                </Text>
                <Text style={[styles.progressText, {color: Colors.mediumRed}]}>
                  ❌ {batchSyncProgress.failedCount} failed
                </Text>
              </View>
            </View>
          </View>
        )}

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
          <>
            {/* Debug info */}
            {/* {__DEV__ && (
              <View style={{padding: 10, backgroundColor: '#f0f0f0'}}>
                <Text style={{fontSize: 12, color: '#666'}}>
                  Debug: Transactions count: {transactions.length}, Total:{' '}
                  {totalAmount}
                </Text>
              </View>
            )} */}
            <FlatList
              key={`transactions-${transactions.length}-${Date.now()}`} // Force re-render when transactions change
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
          </>
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
    color: Colors.primaryColor,
    width: 40,
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
  batchSyncContainer: {
    backgroundColor: Colors.lightGrey,
    padding: 15,
    marginTop: 10,
    borderRadius: 8,
    elevation: 3,
  },
  batchSyncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  batchSyncTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkGrey,
    marginLeft: 10,
  },
  batchSyncProgress: {
    marginBottom: 10,
  },
  progressBar: {
    height: 10,
    backgroundColor: Colors.grey,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primaryColor,
    borderRadius: 5,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressText: {
    fontSize: 14,
    color: Colors.darkGrey,
  },
  progressResults: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});
