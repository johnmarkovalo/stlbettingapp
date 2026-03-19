import React, {useEffect, useState, useRef, useCallback, useMemo} from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import Styles from './Styles';
import Colors from '../../../Styles/Colors';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import moment from 'moment';
import {useDispatch, useSelector, shallowEqual} from 'react-redux';
import BottomDrawer, {
  BottomDrawerMethods,
} from 'react-native-animated-bottom-drawer';
import Bet from '../../../models/Bet';
import Transaction from '../../../models/Transaction';
import {BetItem} from '../../../components/BetItem';
import {
  checkIfTriple,
  checkInternetConnection,
  convertToTransData,
  getCurrentDraw,
  sortNumber,
  isWithin15MinutesOfCutoff,
} from '../../../helper/functions';
import {
  getLatestTransaction,
  insertTransaction,
  updateTransactionStatus,
  getCombinationAmounts,
  getPOSCombinationAmounts,
  getTotalUnsyncedCount,
} from '../../../database';
import {printTransaction} from '../../../helper/printer';
import {sendTransactionAPI, getSoldOutsAPI} from '../../../helper/api';
import {
  localSoldOutsActions,
  combinationAmountsActions,
  posCombinationCapActions,
} from '../../../store/actions';
import {
  useInputReducer,
  useSoldoutChecker,
  type FocusedField,
} from '../../../hooks';

// ============================================================================
// Types
// ============================================================================

interface RootState {
  auth: {
    user: any;
    token: string;
  };
  localSoldOuts: {
    serverSoldouts: any[];
    loading: boolean;
    error: any;
  };
  combinationAmounts: {
    amounts: Record<string, number>;
    lastUpdated: string | null;
  };
  posCombinationCap: {
    amounts: Record<string, number>;
    lastUpdated: string | null;
  };
}

interface TransacScreenProps {
  route: {
    params: {
      betType: any;
    };
  };
  navigation: any;
}

interface KeyboardButton {
  key: string;
  label: string;
  color: string;
  icon?: string;
  action: () => void;
  longPressAction?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const widthScreen = Dimensions.get('window').width;
const REFRESH_INTERVAL = 60000; // 60 seconds (reduced from 30s)
const DRAW_CHECK_INTERVAL = 30000; // 30 seconds
const MAX_BETS_PER_TRANSACTION = 10; // Maximum bets allowed per transaction
const MAX_UNSYNCED_TRANSACTIONS = 5; // Maximum unsynced transactions before blocking new ones (reduced from 15 to prevent quota violations)

// ============================================================================
// Component
// ============================================================================

const TransacScreen: React.FC<TransacScreenProps> = React.memo(
  ({route, navigation}) => {
    // ========================================
    // Redux Selectors (with shallow equality)
    // ========================================
    const user = useSelector((state: RootState) => state.auth.user);
    const token = useSelector((state: RootState) => state.auth.token);
    const serverSoldouts = useSelector(
      (state: RootState) => state.localSoldOuts.serverSoldouts,
      shallowEqual,
    );
    const combinationAmounts = useSelector(
      (state: RootState) => state.combinationAmounts.amounts,
      shallowEqual,
    );
    const posCombinationCap = useSelector(
      (state: RootState) => state.posCombinationCap.amounts,
      shallowEqual,
    );
    const dispatch = useDispatch();

    // ========================================
    // Refs
    // ========================================
    const internetStatusCheck = useRef(checkInternetConnection());
    const bottomDrawerRef = useRef<BottomDrawerMethods>(null);
    const hasInitialSync = useRef(false);
    const previousDrawRef = useRef<number | null>(null);
    const needsRefresh = useRef({
      combinationAmounts: true,
      posCombinationAmounts: true,
    });

    // ========================================
    // Route params
    // ========================================
    const betType = route.params.betType;
    const betDate = moment().format('YYYY-MM-DD');

    // ========================================
    // State
    // ========================================
    const [currentDraw, setCurrentDraw] = useState<number | null>(null);
    const [totalAmount, setTotalAmount] = useState(0);
    const [bets, setBets] = useState<Bet[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingSoldouts, setIsLoadingSoldouts] = useState(false);
    const [unsyncedCount, setUnsyncedCount] = useState(0);

    // ========================================
    // Custom Hooks - Input State
    // ========================================
    const {
      betNumber,
      targetAmount,
      rambolAmount,
      focusedField,
      isBetNumberFocused,
      isTargetAmountFocused,
      isRambolAmountFocused,
      isBetNumberComplete,
      isTargetAmountComplete,
      targetAmountNum,
      rambolAmountNum,
      shouldAutoAdvanceFromBetNumber,
      shouldAutoAdvanceFromTargetAmount,
      setValue,
      appendValue,
      backspace,
      clearCurrentField,
      setFocus,
      resetAfterBet,
    } = useInputReducer();

    // ========================================
    // Memoized values
    // ========================================
    const currentDrawLabel = useMemo(() => {
      if (currentDraw === null) return 'BET CLOSED';
      if (currentDraw === 1) return '1ST DRAW';
      if (currentDraw === 2) return '2ND DRAW';
      if (currentDraw === 3) return '3RD DRAW';
      return 'BET CLOSED';
    }, [currentDraw]);

    const isBetClosed = useMemo(() => currentDraw === null, [currentDraw]);

    const canAddRambol = useMemo(
      () => !checkIfTriple(betNumber),
      [betNumber],
    );

    // Check if within 15 minutes of cutoff
    const isWithinCutoff = useMemo(() => {
      try {
        if (!betType || !betType.draws || !Array.isArray(betType.draws)) {
          return false;
        }
        if (!currentDraw) {
          return false;
        }
        return isWithin15MinutesOfCutoff(betType.draws, currentDraw);
      } catch (error) {
        console.error('Error calculating isWithinCutoff:', error);
        return false;
      }
    }, [betType, currentDraw]);

    // Check if max bets per transaction is reached
    const isBetLimitReached = useMemo(
      () => bets.length >= MAX_BETS_PER_TRANSACTION,
      [bets.length],
    );

    // Check if too many unsynced transactions
    const isUnsyncedLimitReached = useMemo(
      () => unsyncedCount >= MAX_UNSYNCED_TRANSACTIONS,
      [unsyncedCount],
    );

    // ========================================
    // Custom Hooks - Soldout Checker
    // ========================================
    const {checkSoldout, checkServerSoldout, clearCache} = useSoldoutChecker({
      betTypeId: betType?.id || 0,
      currentDraw,
      betDate,
      serverSoldouts,
      combinationAmounts,
      posCombinationCap,
      currentBets: bets,
      isWithinCutoff,
      isOnline: internetStatusCheck.current?.isConnected() || false,
    });

    // ========================================
    // Data Fetching (with dirty flag pattern)
    // ========================================
    const fetchCombinationAmounts = useCallback(async () => {
      if (!isWithinCutoff || !currentDraw || !betType?.id) {
        dispatch(combinationAmountsActions.clear());
        return;
      }

      if (!needsRefresh.current.combinationAmounts) {
        return;
      }

      try {
        const amounts = (await getCombinationAmounts(
          betDate,
          currentDraw,
          betType.id,
          15,
        )) as Record<string, number>;
        
        dispatch(combinationAmountsActions.update(amounts));
        needsRefresh.current.combinationAmounts = false;
        clearCache(); // Clear soldout cache when amounts change
      } catch (error) {
        console.error('Error fetching combination amounts:', error);
      }
    }, [isWithinCutoff, currentDraw, betDate, betType?.id, dispatch, clearCache]);

    const fetchPOSCombinationAmounts = useCallback(async () => {
      if (!currentDraw || !betType?.id) {
        dispatch(posCombinationCapActions.clear());
        return;
      }

      if (!needsRefresh.current.posCombinationAmounts) {
        return;
      }

      try {
        const amounts = (await getPOSCombinationAmounts(
          betDate,
          currentDraw,
          betType.id,
        )) as Record<string, number>;
        
        dispatch(posCombinationCapActions.update(amounts));
        needsRefresh.current.posCombinationAmounts = false;
        clearCache(); // Clear soldout cache when amounts change
      } catch (error) {
        console.error('Error fetching POS combination amounts:', error);
      }
    }, [currentDraw, betDate, betType?.id, dispatch, clearCache]);

    const markDataDirty = useCallback(() => {
      needsRefresh.current.combinationAmounts = true;
      needsRefresh.current.posCombinationAmounts = true;
    }, []);

    /**
     * Fetch total count of unsynced transactions
     */
    const fetchUnsyncedCount = useCallback(async () => {
      try {
        const count = await getTotalUnsyncedCount();
        setUnsyncedCount(count);
      } catch (error) {
        console.error('Error fetching unsynced count:', error);
      }
    }, []);

    // ========================================
    // Validation (unified, simplified)
    // ========================================
    const validateCapping = useCallback(
      (value: string, type: 'target' | 'rambol'): boolean => {
        const capping = betType?.capping;
        if (!capping || capping <= 0 || !value) return false;

        const numericValue = parseInt(value, 10);
        if (!isNaN(numericValue) && numericValue > capping) {
          Alert.alert(
            'Amount',
            `${type === 'target' ? 'Target' : 'Rambol'} amount cannot be greater than ${capping}`,
          );
          return true;
        }
        return false;
      },
      [betType?.capping],
    );

    const validateAndCheckSoldout = useCallback(
      (showAlert: boolean = true): boolean => {
        // Validate capping
        if (validateCapping(targetAmount, 'target')) return true;
        if (validateCapping(rambolAmount, 'rambol')) return true;

        // Check soldout if bet number is complete
        if (isBetNumberComplete) {
          const result = checkSoldout(
            betNumber,
            targetAmountNum,
            rambolAmountNum,
            showAlert,
          );
          return result.isSoldOut;
        }

        return false;
      },
      [
        betNumber,
        targetAmount,
        rambolAmount,
        targetAmountNum,
        rambolAmountNum,
        isBetNumberComplete,
        validateCapping,
        checkSoldout,
      ],
    );

    // ========================================
    // Input Handling (simplified)
    // ========================================
    
    /**
     * Handle manual focus change (user taps on a field)
     * Uses 'manual' action type to prevent auto-advance
     */
    const handleManualFocusChange = useCallback(
      (field: FocusedField) => {
        setFocus(field, 'manual'); // Manual focus - don't auto-advance
        bottomDrawerRef?.current?.open(hp(45));
      },
      [setFocus],
    );

    /**
     * Handle auto-advance focus change (triggered by completing a field)
     * Uses 'forward' action type
     */
    const handleAutoAdvanceFocus = useCallback(
      (field: FocusedField) => {
        setFocus(field, 'forward'); // Auto-advance keeps forward state
        bottomDrawerRef?.current?.open(hp(45));
      },
      [setFocus],
    );

    /**
     * Handle backward focus change (backspace to previous field)
     * Uses 'backward' action type to prevent auto-advance
     */
    const handleBackwardFocusChange = useCallback(
      (field: FocusedField) => {
        setFocus(field, 'backward'); // Backward - don't auto-advance
        bottomDrawerRef?.current?.open(hp(45));
      },
      [setFocus],
    );

    const onKeyPress = useCallback(
      (input: string) => {
        try {
          if (!input || typeof input !== 'string') return;

          if (isBetNumberFocused && betNumber.length < 3) {
            const newBetNumber = betNumber + input;
            // Use 'forward' action type to enable auto-advance when 3 digits
            setValue('betNumber', newBetNumber, 'forward');
          } else if (isTargetAmountFocused && targetAmount.length < 3) {
            const newValue = targetAmount + input;
            if (validateCapping(newValue, 'target')) return;
            // Use 'forward' action type to enable auto-advance when 3 digits
            setValue('targetAmount', newValue, 'forward');
          } else if (isRambolAmountFocused && rambolAmount.length < 3) {
            if (!canAddRambol) {
              Alert.alert(
                'Triple Digit',
                'You cannot enter rambol amount if triple digit.',
              );
              return;
            }
            const newValue = rambolAmount + input;
            if (validateCapping(newValue, 'rambol')) return;
            setValue('rambolAmount', newValue, 'forward');
          }
        } catch (error) {
          console.error('Error in onKeyPress:', error);
        }
      },
      [
        betNumber,
        targetAmount,
        rambolAmount,
        isBetNumberFocused,
        isTargetAmountFocused,
        isRambolAmountFocused,
        canAddRambol,
        setValue,
        validateCapping,
      ],
    );

    const onBackSpace = useCallback(() => {
      if (isBetNumberFocused && betNumber.length > 0) {
        // Use 'backward' to prevent auto-advance after deletion
        setValue('betNumber', betNumber.slice(0, -1), 'backward');
      } else if (isTargetAmountFocused) {
        if (targetAmount.length > 0) {
          setValue('targetAmount', targetAmount.slice(0, -1), 'backward');
        } else {
          // Navigate back to betNumber - use backward focus
          handleBackwardFocusChange('betNumber');
        }
      } else if (isRambolAmountFocused) {
        if (rambolAmount.length > 0) {
          setValue('rambolAmount', rambolAmount.slice(0, -1), 'backward');
        } else {
          // Navigate back to targetAmount - use backward focus
          handleBackwardFocusChange('targetAmount');
        }
      }
    }, [
      betNumber,
      targetAmount,
      rambolAmount,
      isBetNumberFocused,
      isTargetAmountFocused,
      isRambolAmountFocused,
      setValue,
      handleBackwardFocusChange,
    ]);

    const onClear = useCallback(() => {
      clearCurrentField();
    }, [clearCurrentField]);

    const onNext = useCallback(() => {
      if (validateAndCheckSoldout()) {
        resetAfterBet();
        return;
      }

      if (isTargetAmountFocused) {
        if (canAddRambol) {
          // Check rambol soldout before moving to rambol field
          const result = checkSoldout(betNumber, targetAmountNum, 0, true);
          if (result.isSoldOut) {
            resetAfterBet();
            return;
          }
          if (!targetAmount) {
            setValue('targetAmount', '0', 'forward');
          }
          // Use forward focus for manual next button
          handleAutoAdvanceFocus('rambolAmount');
        } else {
          // Triple digit, submit bet
          addBet();
        }
      }
    }, [
      validateAndCheckSoldout,
      isTargetAmountFocused,
      canAddRambol,
      betNumber,
      targetAmount,
      targetAmountNum,
      checkSoldout,
      setValue,
      handleAutoAdvanceFocus,
      resetAfterBet,
    ]);

    const onNoRambol = useCallback(() => {
      if (isTargetAmountFocused) {
        addBet();
      }
    }, [isTargetAmountFocused]);

    // ========================================
    // Bet Management
    // ========================================
    const addBet = useCallback(() => {
      try {
        // Check bet limit first
        if (isBetLimitReached) {
          Alert.alert(
            'Bet Limit Reached',
            `Maximum ${MAX_BETS_PER_TRANSACTION} bets per transaction. Please submit this transaction first.`,
          );
          return;
        }

        if (validateAndCheckSoldout()) return;

        if (!betNumber) {
          Alert.alert('Error', 'Bet number is required');
          return;
        }

        if (!targetAmount && !rambolAmount) {
          Alert.alert('Error', 'Please enter target or rambol amount');
          return;
        }

        const sortedBetNumber = sortNumber(betNumber);
        if (!sortedBetNumber) {
          Alert.alert('Error', 'Invalid bet number format');
          return;
        }

        const targetAmt = targetAmountNum;
        const rambolAmt = rambolAmountNum;

        if (targetAmt === 0 && rambolAmt === 0) {
          Alert.alert('Error', 'Please enter target or rambol amount');
          return;
        }

        const newBet: Bet = {
          betNumber: betNumber,
          betNumberr: sortedBetNumber,
          tranno: bets.length + 1,
          targetAmount: targetAmt,
          rambolAmount: rambolAmt,
          subtotal: targetAmt + rambolAmt,
        };

        setBets(prev => [newBet, ...prev]);
        resetAfterBet();
        clearCache(); // Clear cache after adding bet
      } catch (error) {
        console.error('Error in addBet:', error);
        Alert.alert('Error', 'Failed to add bet. Please try again.');
      }
    }, [
      isBetLimitReached,
      betNumber,
      targetAmount,
      rambolAmount,
      targetAmountNum,
      rambolAmountNum,
      bets.length,
      validateAndCheckSoldout,
      resetAfterBet,
      clearCache,
    ]);

    const removeBet = useCallback((item: Bet) => {
      setBets(prev =>
        prev.filter(bet => {
          if (item.id && bet.id) return bet.id !== item.id;
          return !(bet.betNumber === item.betNumber && bet.tranno === item.tranno);
        }),
      );
      clearCache(); // Clear cache after removing bet
    }, [clearCache]);

    const showRemoveAlert = useCallback(
      (item: Bet) => {
        Alert.alert(
          'Remove Bet',
          'Are you sure you want to remove this bet?',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'OK', onPress: () => removeBet(item)},
          ],
        );
      },
      [removeBet],
    );

    // ========================================
    // Transaction Creation
    // ========================================
    const createTransaction = useCallback(async () => {
      // CRITICAL: Fetch fresh unsynced count before checking (don't rely on stale state)
      try {
        const freshUnsyncedCount = await getTotalUnsyncedCount();
        if (freshUnsyncedCount >= MAX_UNSYNCED_TRANSACTIONS) {
          setUnsyncedCount(freshUnsyncedCount); // Update state for display
          Alert.alert(
            'Sync Required',
            `You have ${freshUnsyncedCount} unsynced transactions. Please sync your transactions before creating new ones. Maximum allowed: ${MAX_UNSYNCED_TRANSACTIONS}`,
          );
          return;
        }
      } catch (error) {
        console.error('Error checking unsynced count:', error);
        // Continue with transaction if check fails (don't block user due to DB error)
      }

      if (bets.length <= 0) {
        Alert.alert('Error', 'Please add at least one bet');
        return;
      }

      if (!currentDraw) {
        Alert.alert('Error', 'No current draw');
        navigation.goBack();
        return;
      }

      setIsSubmitting(true);

      try {
        const latestTrans: any = await getLatestTransaction(
          betDate,
          currentDraw,
          betType.id,
        );

        const ticketcode = `${user.keycode.substring(user.keycode.length - 4)}-${currentDraw}${betType.id}-${moment().format('YYMMDD-HHmmss')}`;
        const trans_no = latestTrans?.trans_no ? latestTrans.trans_no + 1 : 1;
        const trans_data = convertToTransData(bets);
        const now = moment().format('YYYY-MM-DD HH:mm:ss');

        const transaction: Transaction = {
          ticketcode,
          betdate: betDate,
          bettime: currentDraw,
          bettypeid: betType.id,
          trans_no,
          total: totalAmount,
          trans_data,
          status: 'saved',
          created_at: now,
        };

        const transactionId = await insertTransaction(transaction, bets);

        if (transactionId && typeof transactionId === 'number') {
          printTransaction(transaction, betType, bets, user);
          updateTransactionStatus(transactionId, 'printed');

          if (internetStatusCheck.current.isConnected()) {
            const newTransaction = {
              ...transaction,
              status: 'VALID',
              gateway: 'Retrofit',
              keycode: user.keycode,
              remarks: '',
              printed_at: now,
              declared_gross: totalAmount,
              bets,
            };

            try {
              const response = await sendTransactionAPI(token, newTransaction);
              // Only mark as synced if server confirmed success
              if (response?.success === true) {
                updateTransactionStatus(transactionId, 'synced');
              } else {
                // API returned but indicated failure
                console.warn('Transaction sync failed:', response?.message || 'Unknown error');
                setUnsyncedCount(prev => prev + 1);
              }
            } catch (syncError: any) {
              // Network or server error - keep as unsynced for later retry
              console.error('Failed to sync transaction:', syncError?.message || syncError);
              setUnsyncedCount(prev => prev + 1);
            }
          } else {
            // If offline, increment unsynced count
            setUnsyncedCount(prev => prev + 1);
          }

          setBets([]);
          setTotalAmount(0);
          markDataDirty(); // Mark data dirty after transaction

          Alert.alert('Success', 'Transaction created successfully!');
        }
      } catch (error) {
        console.error('Error creating transaction:', error);
        Alert.alert('Error', 'Failed to create transaction. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }, [
      bets,
      currentDraw,
      betDate,
      betType?.id,
      totalAmount,
      user,
      token,
      navigation,
      markDataDirty,
    ]);

    const showCreateTransactionAlert = useCallback(() => {
      Alert.alert('Confirmation', 'Is this your final bets?', [
        {text: 'No'},
        {text: 'Yes', onPress: createTransaction},
      ]);
    }, [createTransaction]);

    // ========================================
    // Soldouts Fetch
    // ========================================
    const fetchSoldouts = useCallback(async (showAlert: boolean = false) => {
      if (!internetStatusCheck.current.isConnected()) return;

      setIsLoadingSoldouts(true);
      try {
        const soldoutsData = await getSoldOutsAPI(token);
        if (soldoutsData) {
          dispatch(localSoldOutsActions.updateServerSoldouts(soldoutsData));
          clearCache(); // Clear cache when soldouts update
        } else if (showAlert) {
          Alert.alert(
            'Warning',
            'Failed to fetch sold-out data. Some combinations may be unavailable.',
          );
        }
      } catch (error: any) {
        console.error('Error fetching soldouts:', error);
        if (showAlert) {
          Alert.alert(
            'Warning',
            'Failed to fetch sold-out data. Please check your connection.',
          );
        }
      } finally {
        setIsLoadingSoldouts(false);
      }
    }, [token, dispatch, clearCache]);

    // ========================================
    // Draw Calculation
    // ========================================
    const recalculateCurrentDraw = useCallback(async () => {
      try {
        if (!betType || !betType.draws || !Array.isArray(betType.draws)) {
          console.error('betType.draws is not available');
          return;
        }

        const draw = getCurrentDraw(betType.draws);

        if (draw !== null) {
          const drawChanged =
            previousDrawRef.current !== null && previousDrawRef.current !== draw;
          setCurrentDraw(draw);
          previousDrawRef.current = draw;

          if (!hasInitialSync.current || drawChanged) {
            // Show alert only on initial sync, not on periodic draw changes
            await fetchSoldouts(!hasInitialSync.current);
            hasInitialSync.current = true;
            markDataDirty(); // Mark dirty on draw change
          }
        } else {
          navigation.goBack();
        }
      } catch (error) {
        console.error('Error in recalculateCurrentDraw:', error);
      }
    }, [betType, fetchSoldouts, navigation, markDataDirty]);

    // ========================================
    // Effects
    // ========================================
    
    // Fetch unsynced count on mount
    useEffect(() => {
      fetchUnsyncedCount();
    }, [fetchUnsyncedCount]);

    // Draw calculation interval
    useEffect(() => {
      recalculateCurrentDraw();
      const intervalId = setInterval(recalculateCurrentDraw, DRAW_CHECK_INTERVAL);
      return () => clearInterval(intervalId);
    }, [recalculateCurrentDraw]);

    // Combination amounts fetch with dirty flag
    useEffect(() => {
      if (isWithinCutoff && currentDraw && betType?.id) {
        fetchCombinationAmounts();
        const intervalId = setInterval(() => {
          needsRefresh.current.combinationAmounts = true;
          fetchCombinationAmounts();
        }, REFRESH_INTERVAL);
        return () => clearInterval(intervalId);
      } else {
        dispatch(combinationAmountsActions.clear());
      }
    }, [isWithinCutoff, currentDraw, betType?.id, fetchCombinationAmounts, dispatch]);

    // POS combination amounts fetch with dirty flag
    useEffect(() => {
      if (currentDraw && betType?.id) {
        fetchPOSCombinationAmounts();
        const intervalId = setInterval(() => {
          needsRefresh.current.posCombinationAmounts = true;
          fetchPOSCombinationAmounts();
        }, REFRESH_INTERVAL);
        return () => clearInterval(intervalId);
      } else {
        dispatch(posCombinationCapActions.clear());
      }
    }, [currentDraw, betType?.id, fetchPOSCombinationAmounts, dispatch]);

    // Total amount calculation
    useEffect(() => {
      setTotalAmount(
        bets.reduce((total, current) => total + (current.subtotal || 0), 0),
      );
    }, [bets]);

    // Auto-focus transition based on input completion
    // IMPORTANT: Only auto-advance when lastAction is 'forward' (user added a digit)
    // Do NOT auto-advance when user backspaces or manually changes focus
    useEffect(() => {
      // Only auto-advance if user just typed the 3rd digit (forward action)
      if (shouldAutoAdvanceFromBetNumber) {
        const result = checkSoldout(betNumber, 0, 0, true);
        if (!result.isSoldOut) {
          handleAutoAdvanceFocus('targetAmount');
        } else {
          resetAfterBet();
        }
      }
    }, [shouldAutoAdvanceFromBetNumber, betNumber, checkSoldout, handleAutoAdvanceFocus, resetAfterBet]);

    useEffect(() => {
      // Only auto-advance if user just typed the 3rd digit (forward action)
      if (shouldAutoAdvanceFromTargetAmount && canAddRambol) {
        const result = checkSoldout(betNumber, targetAmountNum, 0, true);
        if (!result.isSoldOut) {
          handleAutoAdvanceFocus('rambolAmount');
        } else {
          resetAfterBet();
        }
      }
    }, [shouldAutoAdvanceFromTargetAmount, canAddRambol, betNumber, targetAmountNum, checkSoldout, handleAutoAdvanceFocus, resetAfterBet]);

    // ========================================
    // Memoized keyboard buttons
    // ========================================
    const keyboardButtons = useMemo(
      (): KeyboardButton[][] => [
        [
          {key: '1', label: '1', color: Colors.primaryColor, action: () => onKeyPress('1')},
          {key: '2', label: '2', color: Colors.primaryColor, action: () => onKeyPress('2')},
          {key: '3', label: '3', color: Colors.primaryColor, action: () => onKeyPress('3')},
          {key: 'next', label: '', color: Colors.teal, icon: 'arrow-forward', action: onNext},
        ],
        [
          {key: '4', label: '4', color: Colors.primaryColor, action: () => onKeyPress('4')},
          {key: '5', label: '5', color: Colors.primaryColor, action: () => onKeyPress('5')},
          {key: '6', label: '6', color: Colors.primaryColor, action: () => onKeyPress('6')},
          {key: 'noRambol', label: 'NR', color: Colors.mediumYellow, action: onNoRambol},
        ],
        [
          {key: '7', label: '7', color: Colors.primaryColor, action: () => onKeyPress('7')},
          {key: '8', label: '8', color: Colors.primaryColor, action: () => onKeyPress('8')},
          {key: '9', label: '9', color: Colors.primaryColor, action: () => onKeyPress('9')},
          {key: 'addBet', label: '', color: Colors.mediumBlue, icon: 'subdirectory-arrow-left', action: addBet},
        ],
        [
          {key: 'clear', label: 'C', color: 'white', action: onClear},
          {key: '0', label: '0', color: Colors.primaryColor, action: () => onKeyPress('0')},
          {key: 'backspace', label: '', color: 'white', icon: 'backspace', action: onBackSpace},
          {key: 'submit', label: '', color: Colors.mediumGreen, icon: 'done-all', action: showCreateTransactionAlert},
        ],
      ],
      [onKeyPress, onNext, onNoRambol, addBet, onClear, onBackSpace, showCreateTransactionAlert],
    );

    // ========================================
    // Render Functions (memoized)
    // ========================================
    const renderBetItem = useCallback(
      ({item}: {item: Bet}) => (
        <BetItem item={item} onPress={() => showRemoveAlert(item)} />
      ),
      [showRemoveAlert],
    );

    const renderKeyboardRow = useCallback(
      (row: KeyboardButton[], rowIndex: number) => (
        <View key={rowIndex} style={styles.keyBoardWrapper}>
          {row.map(button => (
            <TouchableOpacity
              key={button.key}
              style={[
                styles.keyButtonWrapper,
                {backgroundColor: button.color},
                button.color === 'white' && styles.whiteButton,
              ]}
              onPress={button.action}
              onLongPress={button.longPressAction}
              disabled={isSubmitting}>
              {button.icon ? (
                <MaterialIcons
                  style={[
                    styles.keyButtonText,
                    button.color === 'white' && styles.whiteButtonText,
                  ]}
                  name={button.icon as any}
                  size={20}
                />
              ) : (
                <Text
                  style={[
                    styles.keyButtonText,
                    button.color === 'white' && styles.whiteButtonText,
                  ]}>
                  {button.label}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ),
      [isSubmitting],
    );

    const renderInputField = useCallback(
      (value: string, type: FocusedField, label: string, isFocused: boolean) => (
        <View key={type} style={styles.inputFieldContainer}>
          <Text style={styles.inputLabel}>{label}</Text>
          <TouchableOpacity
            style={[
              styles.inputContainerStyle,
              isFocused && styles.inputContainerFocused,
              isBetClosed && styles.inputContainerDisabled,
            ]}
            onPress={() => {
              if (isBetClosed) return;
              // User manually tapping field - use manual focus to prevent auto-advance
              handleManualFocusChange(type);
            }}
            disabled={isBetClosed}>
            {isFocused && (
              <MaterialIcons
                style={styles.focusIndicator}
                name="arrow-forward"
                size={25}
                color={Colors.primaryColor}
              />
            )}
            <Text
              style={[
                styles.inputTextStyle,
                isBetClosed && styles.inputTextDisabled,
              ]}>
              {value || '0'}
            </Text>
          </TouchableOpacity>
        </View>
      ),
      [isBetClosed, handleManualFocusChange],
    );

    const keyExtractor = useCallback(
      (item: Bet) => item.id?.toString() || `${item.betNumber}-${item.tranno}`,
      [],
    );

    // ========================================
    // Render
    // ========================================
    if (isSubmitting) {
      return (
        <SafeAreaView style={Styles.backgroundWrapper}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primaryColor} />
            <Text style={styles.loadingText}>Creating transaction...</Text>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={Styles.backgroundWrapper}>
        <View style={Styles.mainContainer}>
          {/* Header */}
          <View style={[Styles.headerContainer, styles.headerContainerCentered]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back" size={40} color="black" />
            </TouchableOpacity>
            <Text style={[Styles.logoText, styles.boldText]}>
              {betType.name}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Draw Info */}
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <View style={styles.cardSection}>
                <Text style={styles.cardSubTitle}>
                  {moment().format('MMM DD, YYYY')}
                </Text>
              </View>
              <View style={styles.verticalLine} />
              <View style={styles.cardSection}>
                <Text
                  style={[
                    styles.cardSubTitle,
                    isBetClosed && styles.betClosedText,
                  ]}>
                  {currentDrawLabel}
                </Text>
              </View>
              <View style={styles.verticalLine} />
              <View style={styles.cardSection}>
                <Text style={styles.cardSubTitle}>{user?.agent_series}</Text>
              </View>
            </View>
          </View>

          {/* Inputs */}
          <View style={styles.inputCard}>
            <View style={styles.inputCardContent}>
              {renderInputField(betNumber, 'betNumber', 'BET #', isBetNumberFocused)}
              {renderInputField(targetAmount, 'targetAmount', 'TARGET', isTargetAmountFocused)}
              {renderInputField(rambolAmount, 'rambolAmount', 'RAMBOL', isRambolAmountFocused)}
            </View>
          </View>

          {/* Total and Bet Count */}
          <View style={[Styles.headerContainer, styles.totalContainer]}>
            <View style={styles.totalSection}>
              <Text style={Styles.logoText}>Total:</Text>
              <Text style={[Styles.logoText, styles.boldText, styles.totalAmount]}>
                {totalAmount}
              </Text>
            </View>
            <View style={styles.betCountSection}>
              <Text style={[styles.betCountText, isBetLimitReached && styles.betCountWarning]}>
                Bets: {bets.length}/{MAX_BETS_PER_TRANSACTION}
              </Text>
              {isUnsyncedLimitReached && (
                <Text style={styles.unsyncedWarning}>
                  ⚠️ {unsyncedCount} unsynced
                </Text>
              )}
            </View>
          </View>

          {/* Bet List */}
          <FlatList
            data={bets}
            renderItem={renderBetItem}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.betListContainer}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={5}
            getItemLayout={(_, index) => ({
              length: 60,
              offset: 60 * index,
              index,
            })}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No bets added yet</Text>
              </View>
            }
          />

          {/* Keyboard Toggle */}
          <View style={styles.keyBoardWrapper}>
            <TouchableOpacity
              style={styles.showKeyBoard}
              onPress={() => bottomDrawerRef?.current?.open(hp(45))}
              disabled={isBetClosed}>
              <MaterialIcons name="dialpad" size={30} color="white" />
            </TouchableOpacity>
          </View>

          {/* Bottom Drawer Keyboard */}
          <BottomDrawer
            ref={bottomDrawerRef}
            backdropOpacity={0}
            openOnMount
            initialHeight={hp(45)}>
            <View style={styles.keyboardContainer}>
              <View style={styles.wrapper}>
                {keyboardButtons.map(renderKeyboardRow)}
              </View>
            </View>
          </BottomDrawer>
        </View>
      </SafeAreaView>
    );
  },
);

TransacScreen.displayName = 'TransacScreen';

export default React.memo(TransacScreen);

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  headerContainerCentered: {
    justifyContent: 'center',
  },
  backButton: {
    margin: 0,
    padding: 0,
    marginTop: 8,
    position: 'absolute',
    left: 0,
    zIndex: 1,
  },
  boldText: {
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 40,
  },
  card: {
    height: 50,
    elevation: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: hp(0.5),
    marginBottom: hp(0.5),
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  cardSection: {
    width: widthScreen / 3,
    alignItems: 'center',
  },
  cardSubTitle: {
    fontSize: 13,
    color: Colors.primaryColor,
    fontWeight: 'bold',
    alignSelf: 'center',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  betClosedText: {
    color: Colors.mediumRed,
  },
  verticalLine: {
    height: '80%',
    width: 1,
    backgroundColor: 'gray',
  },
  totalAmount: {
    fontWeight: 'bold',
    color: Colors.mediumGreen,
    marginLeft: 10,
  },
  inputContainerStyle: {
    width: widthScreen / 3.5,
    borderRadius: 10,
    margin: 5,
    backgroundColor: 'rgba(114, 114, 114, 0.08)',
    height: 60,
    borderWidth: 1,
    borderColor: Colors.primaryColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainerFocused: {
    borderColor: Colors.mediumBlue,
    borderWidth: 2,
  },
  inputContainerDisabled: {
    opacity: 0.5,
    backgroundColor: 'rgba(114, 114, 114, 0.2)',
  },
  inputTextStyle: {
    fontSize: 30,
    color: Colors.primaryColor,
    fontWeight: 'bold',
    alignSelf: 'center',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  inputTextDisabled: {
    color: Colors.darkGrey,
  },
  focusIndicator: {
    position: 'absolute',
    left: 10,
  },
  inputFieldContainer: {
    width: widthScreen / 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  inputLabel: {
    fontSize: 13,
    color: Colors.primaryColor,
    fontWeight: 'bold',
    marginBottom: hp(0.3),
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  betListContainer: {
    flexGrow: 1,
    paddingHorizontal: 5,
    paddingVertical: 2,
    gap: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.darkGrey,
    textAlign: 'center',
  },
  keyBoardWrapper: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: hp(0.2),
    height: hp(9),
  },
  showKeyBoard: {
    width: wp(97),
    marginTop: hp(1),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: Colors.primaryColor,
  },
  keyboardContainer: {
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  wrapper: {
    width: widthScreen * 0.97,
    alignSelf: 'center',
    marginTop: hp(1.5),
    paddingBottom: hp(2.5),
  },
  keyButtonWrapper: {
    width: wp(24),
    marginTop: wp(0.5),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: Colors.primaryColor,
    height: hp(8),
  },
  whiteButton: {
    borderWidth: 1,
    borderColor: Colors.primaryColor,
  },
  keyButtonText: {
    fontSize: 30,
    fontFamily: 'Nunito-ExtraBold',
    color: Colors.White,
  },
  whiteButtonText: {
    color: Colors.primaryColor,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: Colors.primaryColor,
    fontWeight: 'bold',
  },
  inputCard: {
    height: 100,
    elevation: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(0.5),
    marginTop: hp(0.5),
  },
  inputCardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 10,
  },
  totalContainer: {
    marginTop: hp(0.5),
    marginBottom: hp(0.5),
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  totalSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  betCountSection: {
    alignItems: 'flex-end',
  },
  betCountText: {
    fontSize: 12,
    color: Colors.darkGrey,
    fontWeight: '600',
  },
  betCountWarning: {
    color: Colors.mediumRed,
    fontWeight: 'bold',
  },
  unsyncedWarning: {
    fontSize: 11,
    color: Colors.mediumRed,
    fontWeight: '600',
    marginTop: 2,
  },
});
