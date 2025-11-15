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
} from '../../../helper/functions';
import {
  getLatestTransaction,
  insertTransaction,
  updateTransactionStatus,
} from '../../../database';
import {printTransaction} from '../../../helper/printer';
import {sendTransactionAPI, getSoldOutsAPI} from '../../../helper/api';
import {soldoutsActions} from '../../../store/actions';

// Define types for Redux state
interface RootState {
  auth: {
    user: any;
    token: string;
  };
  soldouts: {
    soldouts: any[];
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
    const soldouts = useSelector((state: RootState) => state.soldouts.soldouts);
    const dispatch = useDispatch();

    // Refs
    const internetStatusCheck = useRef(checkInternetConnection());
    const bottomDrawerRef = useRef<BottomDrawerMethods>(null);
    const hasInitialSync = useRef(false);

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

    // Helper function to check if a bet number is sold out
    const checkSoldOut = useCallback(
      (number: string, checkType: 'target' | 'rambol'): boolean => {
        if (!number || number.length !== 3 || soldouts.length === 0) {
          return false;
        }

        if (checkType === 'target') {
          const isSoldOut = soldouts.some(
            soldout =>
              soldout.combination === number && soldout.is_target === 1,
          );
          if (isSoldOut) {
            Alert.alert('Sold Out', `Number ${number} is sold out for target`);
            return true;
          }
        } else if (checkType === 'rambol') {
          const sortedNumber = sortNumber(number);
          const isSoldOut = soldouts.some(
            soldout =>
              soldout.combination === sortedNumber && soldout.is_target === 0,
          );
          if (isSoldOut) {
            Alert.alert('Sold Out', `Number ${number} is sold out for rambol`);
            return true;
          }
        }

        return false;
      },
      [soldouts],
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

        // Check sold out
        if (soldouts.length > 0) {
          switch (type) {
            case 'targetAmount': {
              const targetAmountSoldOut = soldouts.find(
                soldout =>
                  soldout.combination === betNumber.value &&
                  soldout.is_target === 1,
              );
              if (targetAmountSoldOut) {
                Alert.alert(
                  'Sold Out',
                  `Number ${targetAmount.value} is sold out for target`,
                );
                return true;
              }
              break;
            }
            case 'rambolAmount': {
              const rambolAmountSoldOut = soldouts.find(
                soldout =>
                  soldout.combination === sortNumber(betNumber.value) &&
                  soldout.is_target === 0,
              );
              if (rambolAmountSoldOut) {
                Alert.alert(
                  'Sold Out',
                  `Number ${rambolAmount.value} is sold out for rambol`,
                );
                return true;
              }
              break;
            }
          }
        }

        return false;
      },
      [
        betNumber.value,
        targetAmount.value,
        rambolAmount.value,
        betType.capping,
        soldouts,
      ],
    );

    const changeFocus = useCallback(
      (type: string) => {
        if (validateBet(type)) return;

        // Additional soldout checks before changing focus
        if (type === 'targetAmount' && betNumber.value.length === 3) {
          if (checkSoldOut(betNumber.value, 'target')) {
            setBetNumber({value: '', isFocus: true});
            return;
          }
        }
        if (type === 'rambolAmount' && betNumber.value.length === 3) {
          if (checkSoldOut(betNumber.value, 'rambol')) {
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
        checkSoldOut,
      ],
    );

    const addBet = useCallback(() => {
      if (validateBet()) return;

      if (betNumber.value && (targetAmount.value || rambolAmount.value)) {
        const newBet: Bet = {
          betNumber: betNumber.value,
          betNumberr: sortNumber(betNumber.value),
          tranno: bets.length + 1,
          targetAmount:
            targetAmount.value === '' ? 0 : parseInt(targetAmount.value),
          rambolAmount:
            rambolAmount.value === '' ? 0 : parseInt(rambolAmount.value),
          subtotal: Number(targetAmount.value) + Number(rambolAmount.value),
        };

        setBets(prev => [newBet, ...prev]);

        // Reset inputs
        setBetNumber({value: '', isFocus: true});
        setTargetAmount({value: '', isFocus: false});
        setRambolAmount({value: '', isFocus: false});
      } else {
        Alert.alert('Error', 'Please fill in all fields');
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
        // Map first if what is focused
        if (betNumber.isFocus && betNumber.value.length < 3) {
          const newBetNumber = betNumber.value + input;
          // If bet number will be complete (3 digits), check soldouts before setting
          if (newBetNumber.length === 3) {
            // Check if sold out for target (we'll check rambol later when needed)
            if (checkSoldOut(newBetNumber, 'target')) {
              // Clear the bet number if sold out
              setBetNumber({value: '', isFocus: true});
              return;
            }
          }
          setBetNumber(prev => ({
            ...prev,
            value: prev.value + input,
          }));
        } else if (targetAmount.isFocus && targetAmount.value.length < 3) {
          // Check capping before allowing input
          const newValue = targetAmount.value + input;
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
          setTargetAmount(prev => ({
            ...prev,
            value: prev.value + input,
          }));
        } else if (rambolAmount.isFocus && rambolAmount.value.length < 3) {
          if (!checkIfTriple(betNumber.value)) {
            // Check capping before allowing input
            const newValue = rambolAmount.value + input;
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
            setRambolAmount(prev => ({
              ...prev,
              value: prev.value + input,
            }));
          } else
            Alert.alert(
              'Triple Digit',
              'You cannot enter rambol amount if tripple digit.',
              [{text: 'OK', onPress: () => console.log('OK Pressed')}],
              {cancelable: false},
            );
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
        checkSoldOut,
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
        if (
          betNumber.value.length === 3 &&
          checkSoldOut(betNumber.value, 'rambol')
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
      checkSoldOut,
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
          dispatch(soldoutsActions.update(soldoutsData));
        }
      } catch (error) {
        console.error('Error fetching soldouts:', error);
      } finally {
        setIsLoadingSoldouts(false);
      }
    }, [token, dispatch]);

    const recalculateCurrentDraw = useCallback(async () => {
      const draw = getCurrentDraw(betType.draws);
      console.log('currentDraw trans', draw);

      if (draw !== null) {
        setCurrentDraw(draw);

        // Fetch soldouts only once on initial load
        if (!hasInitialSync.current) {
          await fetchSoldouts();
          hasInitialSync.current = true;
        }
      } else {
        navigation.goBack();
      }
    }, [betType.draws, fetchSoldouts, navigation]);

    // Effects
    useEffect(() => {
      recalculateCurrentDraw();

      const intervalId = setInterval(recalculateCurrentDraw, 30000);
      return () => clearInterval(intervalId);
    }, [recalculateCurrentDraw]);

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
        if (!checkSoldOut(betNumber.value, 'target')) {
          changeFocus('targetAmount');
        } else {
          // Clear bet number if sold out
          setBetNumber({value: '', isFocus: true});
        }
      }
      if (targetAmount.value.length === 3 && targetAmount.isFocus) {
        if (!checkIfTriple(betNumber.value)) {
          // Check if sold out for rambol before allowing focus change
          if (!checkSoldOut(betNumber.value, 'rambol')) {
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
      checkSoldOut,
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
