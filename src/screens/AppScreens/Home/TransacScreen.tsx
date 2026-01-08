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
import {useDispatch, useSelector} from 'react-redux';
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
} from '../../../database';
import {printTransaction} from '../../../helper/printer';
import {sendTransactionAPI, getSoldOutsAPI} from '../../../helper/api';
import {
  localSoldOutsActions,
  combinationAmountsActions,
  posCombinationCapActions,
} from '../../../store/actions';

// Define types for Redux state
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

interface InputState {
  value: string;
  isFocus: boolean;
}

interface KeyboardButton {
  key: string;
  label: string;
  color: string;
  icon?: string;
  action: () => void;
  longPressAction?: () => void;
}

const widthScreen = Dimensions.get('window').width;

const TransacScreen: React.FC<TransacScreenProps> = React.memo(
  ({route, navigation}) => {
    const user = useSelector((state: RootState) => state.auth.user);
    const token = useSelector((state: RootState) => state.auth.token);
    const serverSoldouts = useSelector(
      (state: RootState) => state.localSoldOuts.serverSoldouts,
    );
    const combinationAmounts = useSelector(
      (state: RootState) => state.combinationAmounts.amounts,
    );
    const posCombinationCap = useSelector(
      (state: RootState) => state.posCombinationCap.amounts,
    );
    const dispatch = useDispatch();

    // Refs
    const internetStatusCheck = useRef(checkInternetConnection());
    const bottomDrawerRef = useRef<BottomDrawerMethods>(null);
    const hasInitialSync = useRef(false);
    const previousDrawRef = useRef<number | null>(null);

    // Route params
    const betType = route.params.betType;
    const betDate = moment().format('YYYY-MM-DD');

    // State
    const [currentDraw, setCurrentDraw] = useState<number | null>(null);
    const [totalAmount, setTotalAmount] = useState(0);
    const [betNumber, setBetNumber] = useState<InputState>({
      value: '',
      isFocus: true,
    });
    const [targetAmount, setTargetAmount] = useState<InputState>({
      value: '',
      isFocus: false,
    });
    const [rambolAmount, setRambolAmount] = useState<InputState>({
      value: '',
      isFocus: false,
    });
    const [bets, setBets] = useState<Bet[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingSoldouts, setIsLoadingSoldouts] = useState(false);

    // Memoized values
    const currentDrawLabel = useMemo(() => {
      if (currentDraw === null) return 'BET CLOSED';
      if (currentDraw === 1) return '1ST DRAW';
      if (currentDraw === 2) return '2ND DRAW';
      if (currentDraw === 3) return '3RD DRAW';
      return 'BET CLOSED';
    }, [currentDraw]);

    const isBetClosed = useMemo(() => currentDraw === null, [currentDraw]);

    const canAddRambol = useMemo(
      () => !checkIfTriple(betNumber.value),
      [betNumber.value],
    );

    // Check if within 15 minutes of cutoff
    // Add safety checks to prevent crashes if betType.draws is undefined/null
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

    // Fetch and update combination amounts (optimized - uses SQL aggregation)
    const fetchCombinationAmounts = useCallback(async () => {
      if (!isWithinCutoff || !currentDraw) return;

      try {
        // Use optimized SQL aggregation instead of fetching all transactions and bets
        const amounts = (await getCombinationAmounts(
          betDate,
          currentDraw,
          betType.id,
          15, // 15 minutes window
        )) as Record<string, number>;
        
        dispatch(combinationAmountsActions.update(amounts));
      } catch (error) {
        console.error('Error fetching combination amounts:', error);
      }
    }, [isWithinCutoff, currentDraw, betDate, betType.id, dispatch]);

    // Check combination amount limit (50 within 15 minutes before cutoff)
    // Purpose: Limit total winning payout amount to prevent competitors from placing large bets
    //
    // Business Logic: If winning number is "123", payout includes:
    // - All target bets with exact "123"
    // - All rambol bets with ANY permutation of "123" (123, 321, 213, 231, 312, 132)
    // Total Payout = target(123) + rambol(all permutations of 123)
    //
    // Implementation:
    // - Target amounts are separate per exact bet number (target 123 ≠ target 321)
    // - Rambol amounts are shared across all permutations (rambol 123 = rambol 321 = rambol 213, etc.)
    // - Total = target(exact) + rambol(all permutations)
    // Example 1: Target 123=10, Rambol 123=10 → Total Payout = 10 + 10 = 20
    // Example 2: Target 321=10, Rambol 321=10 → Total Payout = 10 + (10 + 10) = 30
    //   (target 321 is separate, but rambol includes previous rambol from 123)
    //
    // IMPORTANT: Redux contains amounts from DB transactions only (fetched via fetchCombinationAmounts).
    // Current transaction's bets are NOT in DB yet, so we need to add them manually.
    // However, we must be careful: if fetchCombinationAmounts runs AFTER addBet updates Redux,
    // it will REPLACE Redux with DB amounts only, losing the current transaction's bets.
    // So we always add current transaction's bets to ensure accuracy.
    const checkCombinationLimit = useCallback(
      (betNum: string, targetAmt: number, rambolAmt: number): boolean => {
        try {
          if (!isWithinCutoff || !currentDraw || !betNum) return false;

          // Safety check: Ensure betType exists
          if (!betType || !betType.id) {
            console.error('betType is not available in checkCombinationLimit');
            return false;
          }

          // Safety check: Ensure combinationAmounts exists
          if (!combinationAmounts || typeof combinationAmounts !== 'object') {
            console.error('combinationAmounts is not available');
            return false;
          }

          const key = `${betType.id}_${currentDraw}`;
          const LIMIT = 50;

          // Get target amount for exact bet number from Redux (DB transactions only)
          const targetKey = `${key}_target_${betNum}`;
          let existingTarget = combinationAmounts[targetKey] || 0;

          // Get rambol amount for sorted number from Redux (DB transactions only)
          // e.g., rambol for "123" includes amounts from 123, 321, 213, 231, 312, 132
          // So rambol 321 uses the same rambol_123 key as rambol 123
          const sortedNumber = sortNumber(betNum);
          if (!sortedNumber) {
            console.error('Failed to sort bet number:', betNum);
            return false;
          }
          const rambolKey = `${key}_rambol_${sortedNumber}`;
          let existingRambol = combinationAmounts[rambolKey] || 0;

          // Add amounts from bets already in the current transaction (not yet saved to DB)
          // Note: These bets are NOT in Redux because Redux only contains DB amounts.
          // Even if addBet updated Redux, fetchCombinationAmounts will replace it with DB amounts.
          if (bets && Array.isArray(bets)) {
            bets.forEach(bet => {
              // Safety check: Ensure bet object exists and has required properties
              if (!bet || !bet.betNumber) {
                return;
              }
              try {
                if (bet.betNumber === betNum) {
                  existingTarget += bet.targetAmount || 0;
                }
                // For rambol, check if sorted numbers match
                const betSortedNumber = sortNumber(bet.betNumber);
                if (betSortedNumber && betSortedNumber === sortedNumber) {
                  existingRambol += bet.rambolAmount || 0;
                }
              } catch (error) {
                console.error(
                  'Error processing bet in checkCombinationLimit:',
                  error,
                );
                // Continue processing other bets
              }
            });
          }

          // Calculate current total and new total
          const currentTotal = existingTarget + existingRambol;
          const newTotal = currentTotal + targetAmt + rambolAmt;

          // Check if total exceeds 50
          if (newTotal > LIMIT) {
            const remaining = LIMIT - currentTotal;

            // Calculate maximum amounts they can bet
            let maxTarget = remaining;
            let maxRambol = remaining;

            // If they're betting both, we need to show the maximum for each
            // The remaining can be split between target and rambol
            if (targetAmt > 0 && rambolAmt > 0) {
              // Show maximum for each (they can bet up to remaining total)
              Alert.alert(
                'Sold Out',
                `Combination ${betNum} is sold out. Maximum you can bet: Target ${maxTarget}, Rambol ${maxRambol} (Total: ${remaining})`,
              );
            } else if (targetAmt > 0) {
              // Only betting target
              Alert.alert(
                'Sold Out',
                `Combination ${betNum} is sold out. Maximum you can bet for target: ${maxTarget}`,
              );
            } else if (rambolAmt > 0) {
              // Only betting rambol
              Alert.alert(
                'Sold Out',
                `Combination ${betNum} is sold out. Maximum you can bet for rambol: ${maxRambol}`,
              );
            }
            return true;
          }

          return false;
        } catch (error) {
          console.error('Error in checkCombinationLimit:', error);
          // Return false to allow betting to continue rather than crash
          return false;
        }
      },
      [isWithinCutoff, currentDraw, betType, combinationAmounts, bets],
    );

    // Fetch and update POS combination amounts (for entire draw, not just 15 minutes)
    // Optimized - uses SQL aggregation instead of fetching all transactions and bets
    const fetchPOSCombinationAmounts = useCallback(async () => {
      if (!currentDraw) return;

      try {
        // Use optimized SQL aggregation instead of fetching all transactions and bets
        const amounts = (await getPOSCombinationAmounts(
          betDate,
          currentDraw,
          betType.id,
        )) as Record<string, number>;
        
        dispatch(posCombinationCapActions.update(amounts));
      } catch (error) {
        console.error('Error fetching POS combination amounts:', error);
      }
    }, [currentDraw, betDate, betType.id, dispatch]);

    // Check POS combination amount limit (750 per draw)
    // Same logic as checkCombinationLimit but for entire draw with 750 limit
    //
    // IMPORTANT: Redux contains amounts from DB transactions only (fetched via fetchPOSCombinationAmounts).
    // Current transaction's bets are NOT in DB yet, so we need to add them manually.
    // However, we must be careful: if fetchPOSCombinationAmounts runs AFTER addBet updates Redux,
    // it will REPLACE Redux with DB amounts only, losing the current transaction's bets.
    // So we always add current transaction's bets to ensure accuracy.
    const checkPOSCombinationLimit = useCallback(
      (betNum: string, targetAmt: number, rambolAmt: number): boolean => {
        try {
          if (!currentDraw || !betNum) return false;

          // Safety check: Ensure betType exists
          if (!betType || !betType.id) {
            console.error(
              'betType is not available in checkPOSCombinationLimit',
            );
            return false;
          }

          // Safety check: Ensure posCombinationCap exists
          if (!posCombinationCap || typeof posCombinationCap !== 'object') {
            console.error('posCombinationCap is not available');
            return false;
          }

          const key = `${betType.id}_${currentDraw}`;
          const LIMIT = 750;

          // Get target amount for exact bet number from Redux (DB transactions only)
          const targetKey = `${key}_target_${betNum}`;
          let existingTarget = posCombinationCap[targetKey] || 0;

          // Get rambol amount for sorted number from Redux (DB transactions only)
          const sortedNumber = sortNumber(betNum);
          if (!sortedNumber) {
            console.error('Failed to sort bet number:', betNum);
            return false;
          }
          const rambolKey = `${key}_rambol_${sortedNumber}`;
          let existingRambol = posCombinationCap[rambolKey] || 0;

          // Add amounts from bets already in the current transaction (not yet saved to DB)
          // Note: These bets are NOT in Redux because Redux only contains DB amounts.
          // Even if addBet updated Redux, fetchPOSCombinationAmounts will replace it with DB amounts.
          if (bets && Array.isArray(bets)) {
            bets.forEach(bet => {
              // Safety check: Ensure bet object exists and has required properties
              if (!bet || !bet.betNumber) {
                return;
              }
              try {
                if (bet.betNumber === betNum) {
                  existingTarget += bet.targetAmount || 0;
                }
                // For rambol, check if sorted numbers match
                const betSortedNumber = sortNumber(bet.betNumber);
                if (betSortedNumber && betSortedNumber === sortedNumber) {
                  existingRambol += bet.rambolAmount || 0;
                }
              } catch (error) {
                console.error(
                  'Error processing bet in checkPOSCombinationLimit:',
                  error,
                );
                // Continue processing other bets
              }
            });
          }

          // Calculate current total and new total
          const currentTotal = existingTarget + existingRambol;
          const newTotal = currentTotal + targetAmt + rambolAmt;

          // Check if total exceeds 750
          if (newTotal > LIMIT) {
            const remaining = LIMIT - currentTotal;

            // Calculate maximum amounts they can bet
            let maxTarget = remaining;
            let maxRambol = remaining;

            // If they're betting both, we need to show the maximum for each
            // The remaining can be split between target and rambol
            if (targetAmt > 0 && rambolAmt > 0) {
              // Show maximum for each (they can bet up to remaining total)
              Alert.alert(
                'Sold Out',
                `Combination ${betNum} is sold out. Maximum you can bet: Target ${maxTarget}, Rambol ${maxRambol} (Total: ${remaining})`,
              );
            } else if (targetAmt > 0) {
              // Only betting target
              Alert.alert(
                'Sold Out',
                `Combination ${betNum} is sold out. Maximum you can bet for target: ${maxTarget}`,
              );
            } else if (rambolAmt > 0) {
              // Only betting rambol
              Alert.alert(
                'Sold Out',
                `Combination ${betNum} is sold out. Maximum you can bet for rambol: ${maxRambol}`,
              );
            }
            return true;
          }

          return false;
        } catch (error) {
          console.error('Error in checkPOSCombinationLimit:', error);
          // Return false to allow betting to continue rather than crash
          return false;
        }
      },
      [currentDraw, betType, posCombinationCap, bets],
    );

    // Unified LocalSoldOut check - hierarchical checks in order:
    // 1. Check Server Soldout (from API/Redux) filtered by bettypeid, date, draw - if true, stop
    //    (Check regardless of online/offline status - use cached serverSoldouts if available)
    // 2. If OFFLINE and no serverSoldouts match: Check Local Soldout (POSCombinationCap - 750 per draw) - if true, stop
    // 3. Check 15-minute limit (50) - only if within 15 minutes of cutoff
    const checkLocalSoldOut = useCallback(
      (
        number: string,
        checkType: 'target' | 'rambol',
        targetAmt: number = 0,
        rambolAmt: number = 0,
      ): boolean => {
        try {
          if (!number || number.length !== 3) {
            return false;
          }

          // Safety check: Ensure internetStatusCheck ref is initialized
          if (!internetStatusCheck.current) {
            console.error('internetStatusCheck ref is not initialized');
            return false;
          }

          // Safety check: Ensure betType exists
          if (!betType || !betType.id) {
            console.error('betType is not available');
            return false;
          }

          const isOnline = internetStatusCheck.current.isConnected();
          let isSoldOutFromServer = false;

          // 1. Check Server Soldout (from API/Redux) - filtered by bettypeid, date, draw
          // Check regardless of online/offline status - use cached serverSoldouts if available
          if (
            serverSoldouts &&
            Array.isArray(serverSoldouts) &&
            serverSoldouts.length > 0 &&
            currentDraw
          ) {
            // Filter soldouts by bettypeid, date, and draw to ensure we're checking the correct draw
            // IMPORTANT: Only include soldouts that match ALL criteria (bettypeid, date, draw)
            // If any field is missing, exclude it to prevent false positives from other draws
            const filteredSoldouts = serverSoldouts.filter(soldout => {
              // Safety check: Ensure soldout object exists
              if (!soldout || typeof soldout !== 'object') {
                return false;
              }

              // Require all fields to exist and match - strict filtering prevents cross-draw contamination
              const hasBetType = soldout.bettypeid !== undefined;
              const hasDate = soldout.betdate !== undefined;
              const hasDraw = soldout.bettime !== undefined;

              // Only include if all fields exist and match
              if (!hasBetType || !hasDate || !hasDraw) {
                return false; // Exclude soldouts with missing fields
              }

              return (
                soldout.bettypeid === betType.id &&
                soldout.betdate === betDate &&
                soldout.bettime === currentDraw
              );
            });

            if (checkType === 'target') {
              isSoldOutFromServer = filteredSoldouts.some(
                soldout =>
                  soldout &&
                  soldout.combination === number &&
                  soldout.is_target === 1,
              );
            } else if (checkType === 'rambol') {
              const sortedNumber = sortNumber(number);
              if (sortedNumber) {
                isSoldOutFromServer = filteredSoldouts.some(
                  soldout =>
                    soldout &&
                    soldout.combination === sortedNumber &&
                    soldout.is_target === 0,
                );
              }
            }

            if (isSoldOutFromServer) {
              Alert.alert('Sold Out', `Combination ${number} is sold out`);
              return true; // Stop here, no need to check further
            }
          }

          // 2. If OFFLINE and not sold out from server: Check Local Soldout (POSCombinationCap - 750 per draw)
          // Only check if offline, amounts are provided, and we have a current draw
          if (!isOnline && currentDraw && (targetAmt > 0 || rambolAmt > 0)) {
            try {
              if (checkPOSCombinationLimit(number, targetAmt, rambolAmt)) {
                return true; // Stop here, no need to check further
              }
            } catch (error) {
              console.error('Error checking POS combination limit:', error);
              // Continue to next check instead of crashing
            }
          }

          // 3. Check 15-minute limit (50) - only if within 15 minutes of cutoff
          // Only check if within cutoff and amounts are provided
          if (isWithinCutoff && (targetAmt > 0 || rambolAmt > 0)) {
            try {
              if (checkCombinationLimit(number, targetAmt, rambolAmt)) {
                return true;
              }
            } catch (error) {
              console.error('Error checking combination limit:', error);
              // Continue instead of crashing
            }
          }

          return false;
        } catch (error) {
          console.error('Error in checkLocalSoldOut:', error);
          // Return false to allow betting to continue rather than crash
          return false;
        }
      },
      [
        serverSoldouts,
        currentDraw,
        betType.id,
        betDate,
        checkPOSCombinationLimit,
        isWithinCutoff,
        checkCombinationLimit,
      ],
    );

    // Memoized functions
    const validateBet = useCallback(
      (type = '') => {
        // Check capping - validate only the relevant field based on type
        const capping = betType?.capping;
        if (!capping || capping <= 0) {
          // If capping is not defined, skip validation
          // (This shouldn't happen, but handle gracefully)
        } else {
          // Validate targetAmount if it has a value and is being checked
          if (targetAmount.value && targetAmount.value !== '') {
            const targetValue = parseInt(targetAmount.value, 10);
            if (!isNaN(targetValue) && targetValue > capping) {
              Alert.alert(
                'Amount',
                `Target amount cannot be greater than ${capping}`,
              );
              return true;
            }
          }

          // Validate rambolAmount if it has a value and is being checked
          if (rambolAmount.value && rambolAmount.value !== '') {
            const rambolValue = parseInt(rambolAmount.value, 10);
            if (!isNaN(rambolValue) && rambolValue > capping) {
              Alert.alert(
                'Amount',
                `Rambol amount cannot be greater than ${capping}`,
              );
              return true;
            }
          }
        }

        // Check LocalSoldOut (combines server soldouts + combination limits)
        if (betNumber.value.length === 3) {
          const targetAmt =
            targetAmount.value && targetAmount.value !== ''
              ? parseInt(targetAmount.value, 10)
              : 0;
          const rambolAmt =
            rambolAmount.value && rambolAmount.value !== ''
              ? parseInt(rambolAmount.value, 10)
              : 0;

          // Always check both target and rambol soldout status
          // Check target soldout first
          if (
            checkLocalSoldOut(betNumber.value, 'target', targetAmt, rambolAmt)
          ) {
            return true;
          }
          // Check rambol soldout (only if not triple and rambol amount exists)
          if (
            rambolAmt > 0 &&
            !checkIfTriple(betNumber.value) &&
            checkLocalSoldOut(betNumber.value, 'rambol', targetAmt, rambolAmt)
          ) {
            return true;
          }
        }

        return false;
      },
      [
        betNumber.value,
        targetAmount.value,
        rambolAmount.value,
        betType.capping,
        checkLocalSoldOut,
      ],
    );

    const changeFocus = useCallback(
      (type: string) => {
        if (validateBet(type)) return;

        // Additional LocalSoldOut checks before changing focus
        if (type === 'targetAmount' && betNumber.value.length === 3) {
          const targetAmt =
            targetAmount.value && targetAmount.value !== ''
              ? parseInt(targetAmount.value, 10)
              : 0;
          const rambolAmt =
            rambolAmount.value && rambolAmount.value !== ''
              ? parseInt(rambolAmount.value, 10)
              : 0;
          if (
            checkLocalSoldOut(betNumber.value, 'target', targetAmt, rambolAmt)
          ) {
            setBetNumber({value: '', isFocus: true});
            return;
          }
        }
        if (type === 'rambolAmount' && betNumber.value.length === 3) {
          const targetAmt =
            targetAmount.value && targetAmount.value !== ''
              ? parseInt(targetAmount.value, 10)
              : 0;
          const rambolAmt =
            rambolAmount.value && rambolAmount.value !== ''
              ? parseInt(rambolAmount.value, 10)
              : 0;
          if (
            checkLocalSoldOut(betNumber.value, 'rambol', targetAmt, rambolAmt)
          ) {
            setBetNumber({value: '', isFocus: true});
            setTargetAmount({value: '', isFocus: false});
            return;
          }
        }

        setBetNumber({
          value: betNumber.value,
          isFocus: false,
        });
        setTargetAmount({
          value: targetAmount.value,
          isFocus: false,
        });
        setRambolAmount({
          value: rambolAmount.value,
          isFocus: false,
        });
        switch (type) {
          case 'betNumber':
            setBetNumber({
              value: betNumber.value,
              isFocus: true,
            });
            break;
          case 'targetAmount':
            setTargetAmount({
              value: targetAmount.value,
              isFocus: true,
            });
            break;
          case 'rambolAmount':
            setRambolAmount({
              value: rambolAmount.value,
              isFocus: true,
            });
            break;
          default:
            break;
        }
      },
      [
        validateBet,
        betNumber.value,
        targetAmount.value,
        rambolAmount.value,
        checkLocalSoldOut,
      ],
    );

    const addBet = useCallback(() => {
      try {
        if (validateBet()) return;

        // Safety checks
        if (!betNumber || !betNumber.value) {
          Alert.alert('Error', 'Bet number is required');
          return;
        }

        if (!targetAmount && !rambolAmount) {
          Alert.alert('Error', 'Please enter target or rambol amount');
          return;
        }

        if (betNumber.value && (targetAmount.value || rambolAmount.value)) {
          // Safety check: Ensure sortNumber doesn't fail
          const sortedBetNumber = sortNumber(betNumber.value);
          if (!sortedBetNumber) {
            Alert.alert('Error', 'Invalid bet number format');
            return;
          }

          const targetAmt =
            targetAmount.value === '' ? 0 : parseInt(targetAmount.value, 10);
          const rambolAmt =
            rambolAmount.value === '' ? 0 : parseInt(rambolAmount.value, 10);

          // Safety check: Ensure amounts are valid numbers
          if (isNaN(targetAmt) || isNaN(rambolAmt)) {
            Alert.alert('Error', 'Invalid amount format');
            return;
          }

          const newBet: Bet = {
            betNumber: betNumber.value,
            betNumberr: sortedBetNumber,
            tranno: (bets && Array.isArray(bets) ? bets.length : 0) + 1,
            targetAmount: targetAmt,
            rambolAmount: rambolAmt,
            subtotal: targetAmt + rambolAmt,
          };

          setBets(prev => {
            // Safety check: Ensure prev is an array
            if (!Array.isArray(prev)) {
              return [newBet];
            }
            return [newBet, ...prev];
          });

          // NOTE: We do NOT update Redux here because:
          // 1. Redux should only contain amounts from DB transactions (fetched via fetchCombinationAmounts/fetchPOSCombinationAmounts)
          // 2. Current transaction's bets are NOT in DB yet, so they shouldn't be in Redux
          // 3. The check functions (checkCombinationLimit/checkPOSCombinationLimit) will add current transaction's bets
          //    from the `bets` array to Redux amounts when checking sold out
          // 4. This prevents double-counting and ensures consistency

          // Reset inputs
          setBetNumber({value: '', isFocus: true});
          setTargetAmount({value: '', isFocus: false});
          setRambolAmount({value: '', isFocus: false});
        } else {
          Alert.alert('Error', 'Please fill in all fields');
        }
      } catch (error) {
        console.error('Error in addBet:', error);
        Alert.alert('Error', 'Failed to add bet. Please try again.');
      }
    }, [
      validateBet,
      betNumber.value,
      targetAmount.value,
      rambolAmount.value,
      bets.length,
    ]);

    const onKeyPress = useCallback(
      (input: string) => {
        try {
          // Safety check: Ensure input is valid
          if (!input || typeof input !== 'string') {
            return;
          }

          // Map first if what is focused
          if (
            betNumber &&
            betNumber.isFocus &&
            typeof betNumber.value === 'string' &&
            betNumber.value.length < 3
          ) {
            const newBetNumber = (betNumber.value || '') + input;
            // If bet number will be complete (3 digits), check LocalSoldOut before setting
            if (newBetNumber.length === 3) {
              // Check if sold out for target (we'll check rambol later when needed)
              // At this point, no amounts yet, so only server soldouts will be checked
              try {
                if (checkLocalSoldOut(newBetNumber, 'target', 0, 0)) {
                  // Clear the bet number if sold out
                  setBetNumber({value: '', isFocus: true});
                  return;
                }
              } catch (error) {
                console.error('Error checking sold out:', error);
                // Continue with input if check fails
              }
            }
            setBetNumber(prev => {
              if (!prev) return {value: input, isFocus: true};
              return {
                ...prev,
                value: (prev.value || '') + input,
              };
            });
          } else if (
            targetAmount &&
            targetAmount.isFocus &&
            typeof targetAmount.value === 'string' &&
            targetAmount.value.length < 3
          ) {
            // Check capping before allowing input
            const newValue = (targetAmount.value || '') + input;
            const capping = betType?.capping;
            if (capping && capping > 0) {
              const numericValue = parseInt(newValue, 10);
              if (!isNaN(numericValue) && numericValue > capping) {
                Alert.alert(
                  'Amount',
                  `Target amount cannot be greater than ${capping}`,
                );
                return;
              }
            }
            setTargetAmount(prev => {
              if (!prev) return {value: input, isFocus: false};
              return {
                ...prev,
                value: (prev.value || '') + input,
              };
            });
          } else if (
            rambolAmount &&
            rambolAmount.isFocus &&
            typeof rambolAmount.value === 'string' &&
            rambolAmount.value.length < 3
          ) {
            if (
              betNumber &&
              betNumber.value &&
              !checkIfTriple(betNumber.value)
            ) {
              // Check capping before allowing input
              const newValue = (rambolAmount.value || '') + input;
              const capping = betType?.capping;
              if (capping && capping > 0) {
                const numericValue = parseInt(newValue, 10);
                if (!isNaN(numericValue) && numericValue > capping) {
                  Alert.alert(
                    'Amount',
                    `Rambol amount cannot be greater than ${capping}`,
                  );
                  return;
                }
              }
              setRambolAmount(prev => {
                if (!prev) return {value: input, isFocus: false};
                return {
                  ...prev,
                  value: (prev.value || '') + input,
                };
              });
            } else {
              Alert.alert(
                'Triple Digit',
                'You cannot enter rambol amount if tripple digit.',
                [{text: 'OK', onPress: () => console.log('OK Pressed')}],
                {cancelable: false},
              );
            }
          }
        } catch (error) {
          console.error('Error in onKeyPress:', error);
          Alert.alert('Error', 'Failed to process input. Please try again.');
        }
      },
      [
        betNumber.isFocus,
        targetAmount.isFocus,
        rambolAmount.isFocus,
        betNumber.value,
        targetAmount.value,
        rambolAmount.value,
        betType?.capping,
        checkLocalSoldOut,
      ],
    );

    const onBackSpace = useCallback(() => {
      if (betNumber.isFocus && betNumber.value.length > 0) {
        setBetNumber(prev => ({
          ...prev,
          value: prev.value.slice(0, -1),
        }));
      } else if (targetAmount.isFocus && targetAmount.value.length > 0) {
        setTargetAmount(prev => ({
          ...prev,
          value: prev.value.slice(0, -1),
        }));
      } else if (targetAmount.isFocus && targetAmount.value.length === 0) {
        changeFocus('betNumber');
      } else if (rambolAmount.isFocus && rambolAmount.value.length > 0) {
        setRambolAmount(prev => ({
          ...prev,
          value: prev.value.slice(0, -1),
        }));
      } else if (rambolAmount.isFocus && rambolAmount.value.length === 0) {
        {
          changeFocus('targetAmount');
          bottomDrawerRef?.current?.open(hp(45));
        }
      }
    }, [betNumber, targetAmount, rambolAmount, changeFocus]);

    const onClear = useCallback(() => {
      if (betNumber.isFocus) {
        setBetNumber(prev => ({...prev, value: ''}));
      } else if (targetAmount.isFocus) {
        setTargetAmount(prev => ({...prev, value: ''}));
      } else if (rambolAmount.isFocus) {
        setRambolAmount(prev => ({...prev, value: ''}));
      }
    }, [betNumber.isFocus, targetAmount.isFocus, rambolAmount.isFocus]);

    const onNext = useCallback(() => {
      if (validateBet()) return;

      if (targetAmount.isFocus && !checkIfTriple(betNumber.value)) {
        // Check if sold out for rambol before allowing focus change
        const targetAmt =
          targetAmount.value && targetAmount.value !== ''
            ? parseInt(targetAmount.value, 10)
            : 0;
        if (
          betNumber.value.length === 3 &&
          checkLocalSoldOut(betNumber.value, 'rambol', targetAmt, 0)
        ) {
          setBetNumber({value: '', isFocus: true});
          setTargetAmount({value: '', isFocus: false});
          return;
        }
        setTargetAmount(prev => ({
          ...prev,
          value: '0',
        }));
        changeFocus('rambolAmount');
      } else if (targetAmount.isFocus && checkIfTriple(betNumber.value)) {
        addBet();
      }
    }, [
      validateBet,
      targetAmount.isFocus,
      betNumber.value,
      changeFocus,
      addBet,
      checkLocalSoldOut,
    ]);

    const onNoRambol = useCallback(() => {
      if (targetAmount.isFocus) {
        addBet();
      }
    }, [targetAmount.isFocus, addBet]);

    const removeBet = useCallback((item: Bet) => {
      setBets(prev =>
        prev.filter(bet => {
          // Use multiple identifiers to ensure unique identification
          if (item.id && bet.id) {
            return bet.id !== item.id;
          }
          // Fallback to bet number and tranno if no ID
          return !(
            bet.betNumber === item.betNumber && bet.tranno === item.tranno
          );
        }),
      );
    }, []);

    const showRemoveAlert = useCallback(
      (item: Bet) => {
        Alert.alert(
          'Remove Bet',
          'Are you sure you want to remove this bet?',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'OK', onPress: () => removeBet(item)},
          ],
          {cancelable: false},
        );
      },
      [removeBet],
    );

    const createTransaction = useCallback(async () => {
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
          // Print transaction
          printTransaction(transaction, betType, bets, user);
          updateTransactionStatus(transactionId, 'printed');

          // Sync with server if online
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

            await sendTransactionAPI(token, newTransaction);
            updateTransactionStatus(transactionId, 'synced');
          }

          // Reset state
          setBets([]);
          setTotalAmount(0);

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
      betType.id,
      totalAmount,
      user,
      token,
      navigation,
    ]);

    const showCreateTransactionAlert = useCallback(() => {
      Alert.alert('Confirmation', 'Is this your final bets?', [
        {text: 'No'},
        {text: 'Yes', onPress: createTransaction},
      ]);
    }, [createTransaction]);

    const fetchSoldouts = useCallback(async () => {
      if (!internetStatusCheck.current.isConnected()) return;

      setIsLoadingSoldouts(true);
      try {
        const soldoutsData = await getSoldOutsAPI(token);
        if (soldoutsData) {
          dispatch(localSoldOutsActions.updateServerSoldouts(soldoutsData));
        }
      } catch (error) {
        console.error('Error fetching soldouts:', error);
      } finally {
        setIsLoadingSoldouts(false);
      }
    }, [token, dispatch]);

    const recalculateCurrentDraw = useCallback(async () => {
      try {
        // Safety check: Ensure betType and draws exist
        if (!betType || !betType.draws || !Array.isArray(betType.draws)) {
          console.error('betType.draws is not available in recalculateCurrentDraw');
          return;
        }

        const draw = getCurrentDraw(betType.draws);
        console.log('currentDraw trans', draw);

        if (draw !== null) {
          const drawChanged =
            previousDrawRef.current !== null && previousDrawRef.current !== draw;
          setCurrentDraw(draw);
          previousDrawRef.current = draw;

          // Fetch soldouts on initial load OR when draw changes (to get fresh soldouts for new draw)
          if (!hasInitialSync.current || drawChanged) {
            await fetchSoldouts();
            hasInitialSync.current = true;
          }
        } else {
          navigation.goBack();
        }
      } catch (error) {
        console.error('Error in recalculateCurrentDraw:', error);
        // Don't navigate away on error, just log it
      }
    }, [betType, fetchSoldouts, navigation]);

    // Effects
    useEffect(() => {
      recalculateCurrentDraw();

      const intervalId = setInterval(recalculateCurrentDraw, 30000);
      return () => clearInterval(intervalId);
    }, [recalculateCurrentDraw]);

    // Fetch combination amounts when within 15 minutes of cutoff
    useEffect(() => {
      try {
        if (isWithinCutoff && currentDraw && betType && betType.id) {
          fetchCombinationAmounts();
          // Refresh every 30 seconds to keep amounts updated
          const intervalId = setInterval(() => {
            // Safety check before fetching
            if (isWithinCutoff && currentDraw && betType && betType.id) {
              fetchCombinationAmounts();
            }
          }, 30000);
          return () => clearInterval(intervalId);
        } else {
          // Clear amounts when not within cutoff
          dispatch(combinationAmountsActions.clear());
        }
      } catch (error) {
        console.error('Error in combination amounts effect:', error);
        // Clear amounts on error to prevent stale data
        dispatch(combinationAmountsActions.clear());
      }
    }, [isWithinCutoff, currentDraw, betType, fetchCombinationAmounts, dispatch]);

    // Fetch POS combination amounts when draw changes (for entire draw, not just 15 minutes)
    useEffect(() => {
      if (currentDraw) {
        fetchPOSCombinationAmounts();
        // Refresh every 30 seconds to keep amounts updated
        const intervalId = setInterval(fetchPOSCombinationAmounts, 30000);
        return () => clearInterval(intervalId);
      } else {
        // Clear amounts when no draw
        dispatch(posCombinationCapActions.clear());
      }
    }, [currentDraw, fetchPOSCombinationAmounts, dispatch]);

    useEffect(() => {
      setTotalAmount(
        bets.reduce((total, current) => total + (current.subtotal || 0), 0),
      );
    }, [bets]);

    useEffect(() => {
      if (validateBet()) return;
      // Check the length after state has been updated
      if (betNumber.value.length === 3 && betNumber.isFocus) {
        // Check if sold out for target before allowing focus change
        // At this point, no amounts yet, so only server soldouts will be checked
        if (!checkLocalSoldOut(betNumber.value, 'target', 0, 0)) {
          changeFocus('targetAmount');
        } else {
          // Clear bet number if sold out
          setBetNumber({value: '', isFocus: true});
        }
      }
      if (targetAmount.value.length === 3 && targetAmount.isFocus) {
        if (!checkIfTriple(betNumber.value)) {
          // Check if sold out for rambol before allowing focus change
          const targetAmt =
            targetAmount.value && targetAmount.value !== ''
              ? parseInt(targetAmount.value, 10)
              : 0;
          if (!checkLocalSoldOut(betNumber.value, 'rambol', targetAmt, 0)) {
            changeFocus('rambolAmount');
          } else {
            // Clear inputs if sold out
            setBetNumber({value: '', isFocus: true});
            setTargetAmount({value: '', isFocus: false});
          }
        }
      }
      if (rambolAmount.value.length === 3 && rambolAmount.isFocus) {
      }
    }, [
      betNumber.value,
      targetAmount.value,
      rambolAmount.value,
      validateBet,
      checkLocalSoldOut,
      changeFocus,
    ]);

    // Memoized keyboard buttons
    const keyboardButtons = useMemo(
      (): KeyboardButton[][] => [
        [
          {
            key: '1',
            label: '1',
            color: Colors.primaryColor,
            action: () => onKeyPress('1'),
          },
          {
            key: '2',
            label: '2',
            color: Colors.primaryColor,
            action: () => onKeyPress('2'),
          },
          {
            key: '3',
            label: '3',
            color: Colors.primaryColor,
            action: () => onKeyPress('3'),
          },
          {
            key: 'next',
            label: '',
            color: Colors.teal,
            icon: 'arrow-forward',
            action: onNext,
          },
        ],
        [
          {
            key: '4',
            label: '4',
            color: Colors.primaryColor,
            action: () => onKeyPress('4'),
          },
          {
            key: '5',
            label: '5',
            color: Colors.primaryColor,
            action: () => onKeyPress('5'),
          },
          {
            key: '6',
            label: '6',
            color: Colors.primaryColor,
            action: () => onKeyPress('6'),
          },
          {
            key: 'noRambol',
            label: 'NR',
            color: Colors.mediumYellow,
            action: onNoRambol,
          },
        ],
        [
          {
            key: '7',
            label: '7',
            color: Colors.primaryColor,
            action: () => onKeyPress('7'),
          },
          {
            key: '8',
            label: '8',
            color: Colors.primaryColor,
            action: () => onKeyPress('8'),
          },
          {
            key: '9',
            label: '9',
            color: Colors.primaryColor,
            action: () => onKeyPress('9'),
          },
          {
            key: 'addBet',
            label: '',
            color: Colors.mediumBlue,
            icon: 'subdirectory-arrow-left',
            action: addBet,
          },
        ],
        [
          {key: 'clear', label: 'C', color: 'white', action: onClear},
          {
            key: '0',
            label: '0',
            color: Colors.primaryColor,
            action: () => onKeyPress('0'),
          },
          {
            key: 'backspace',
            label: '',
            color: 'white',
            icon: 'backspace',
            action: onBackSpace,
          },
          {
            key: 'submit',
            label: '',
            color: Colors.mediumGreen,
            icon: 'done-all',
            action: showCreateTransactionAlert,
          },
        ],
      ],
      [
        onKeyPress,
        onNext,
        onNoRambol,
        addBet,
        onClear,
        onBackSpace,
        showCreateTransactionAlert,
      ],
    );

    // Memoized render functions
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
      (input: InputState, type: string, label: string) => (
        <View key={type} style={styles.inputFieldContainer}>
          <Text style={styles.inputLabel}>{label}</Text>
          <TouchableOpacity
            style={[
              styles.inputContainerStyle,
              input.isFocus && styles.inputContainerFocused,
              isBetClosed && styles.inputContainerDisabled,
            ]}
            onPress={() => {
              if (isBetClosed) return;
              changeFocus(type);
              bottomDrawerRef?.current?.open(hp(45));
            }}
            disabled={isBetClosed}>
            {input.isFocus && (
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
              {input.value || '0'}
            </Text>
          </TouchableOpacity>
        </View>
      ),
      [isBetClosed, changeFocus],
    );

    const keyExtractor = useCallback(
      (item: Bet) => item.id?.toString() || `${item.betNumber}-${item.tranno}`,
      [],
    );

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
          <View
            style={[Styles.headerContainer, styles.headerContainerCentered]}>
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
              {renderInputField(betNumber, 'betNumber', 'BET #')}
              {renderInputField(targetAmount, 'targetAmount', 'TARGET')}
              {renderInputField(rambolAmount, 'rambolAmount', 'RAMBOL')}
            </View>
          </View>

          {/* Total */}
          <View style={[Styles.headerContainer, styles.totalContainer]}>
            <Text style={Styles.logoText}>Total:</Text>
            <Text
              style={[Styles.logoText, styles.boldText, styles.totalAmount]}>
              {totalAmount}
            </Text>
          </View>

          {/* Bet List */}
          <FlatList
            data={bets}
            renderItem={renderBetItem}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.betListContainer}
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
    height: 50, // Reduced height for better space utilization
    elevation: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: hp(0.5), // Reduced margin
    marginBottom: hp(0.5), // Reduced margin
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 10, // Added horizontal padding
  },
  cardSection: {
    width: widthScreen / 3,
    alignItems: 'center', // Ensure content is centered
  },
  cardSubTitle: {
    fontSize: 13, // Reduced font size
    color: Colors.primaryColor,
    fontWeight: 'bold',
    alignSelf: 'center',
    textTransform: 'uppercase',
    textAlign: 'center', // Ensure text is centered
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
    marginLeft: 10, // Added left margin for better spacing
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
    paddingHorizontal: 5, // Added horizontal padding
  },
  inputLabel: {
    fontSize: 13, // Reduced font size
    color: Colors.primaryColor,
    fontWeight: 'bold',
    marginBottom: hp(0.3), // Reduced margin
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  betListContainer: {
    flexGrow: 1,
    paddingHorizontal: 5, // Reduced horizontal padding
    paddingVertical: 2, // Minimal vertical padding
    gap: 0, // Ensure no gap between items
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20, // Reduced padding
  },
  emptyText: {
    fontSize: 16, // Reduced font size
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
    height: 100, // Reduced height for better space utilization
    elevation: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(0.5), // Reduced margin
    marginTop: hp(0.5), // Added top margin
  },
  inputCardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%', // Ensure content takes full width
    paddingHorizontal: 10, // Added horizontal padding
  },
  totalContainer: {
    marginTop: hp(0.5), // Reduced top margin
    marginBottom: hp(0.5), // Reduced bottom margin
    paddingVertical: 10, // Added padding for better spacing
  },
});
