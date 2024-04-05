import React, {useEffect, useState, useRef} from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import Styles from './Styles';
import Colors from '../../../Styles/Colors.ts';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import BottomDrawer, {
  BottomDrawerMethods,
} from 'react-native-animated-bottom-drawer';
import Bet from '../../../models/Bet.ts';
import {BetItem} from '../../../components/BetItem.tsx';
import {
  checkIfTriple,
  convertToTransData,
  getCurrentDraw,
  sortNumber,
} from '../../../helper/functions.js';
import moment from 'moment';
import Transaction from '../../../models/Transaction.ts';
import {
  getLatestTransaction,
  insertTransaction,
} from '../../../helper/sqlite.ts';
import {listPairedDevices, printTransaction} from '../../../helper/printer.js';

const widthScreen = Dimensions.get('window').width;
const TransacScreen = (props: any) => {
  const bottomDrawerRef = useRef<BottomDrawerMethods>(null);
  const betType = props.route.params.betType;
  const betDate = moment().format('YYYY-MM-DD');
  const [currentDraw, setCurrentDraw] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [betNumber, setBetNumber] = useState({
    value: '',
    isFocus: true,
  });
  const [targetAmount, setTargetAmount] = useState({
    value: '',
    isFocus: false,
  });
  const [rambolAmount, setRambolAmount] = useState({
    value: '',
    isFocus: false,
  });
  const [bets, setBets] = useState<Bet[]>([
    {
      tranno: 1,
      betNumber: '123',
      betNumberr: '123',
      targetAmount: '100',
      rambolAmount: '20',
      subtotal: 120,
    },
    {
      tranno: 2,
      betNumber: '456',
      betNumberr: '456',
      targetAmount: '5',
      rambolAmount: '0',
      subtotal: 5,
    },
    {
      tranno: 3,
      betNumber: '789',
      betNumberr: '789',
      targetAmount: '20',
      rambolAmount: '10',
      subtotal: 30,
    },
  ]);

  const renderItem = ({item}: {item: Bet}) => {
    return (
      <BetItem
        item={item}
        onPress={() => {
          showAlert(item);
        }}
      />
    );
  };

  useEffect(() => {
    // Check the length after state has been updated
    if (betNumber.value.length === 3 && betNumber.isFocus) {
      changeFocus('targetAmount');
    }
    if (targetAmount.value.length === 3 && targetAmount.isFocus) {
      if (!checkIfTriple(betNumber.value)) changeFocus('rambolAmount');
    }
    if (rambolAmount.value.length === 3 && rambolAmount.isFocus) {
    }
  }, [betNumber.value, targetAmount.value, rambolAmount.value]);

  useEffect(() => {
    setTotalAmount(
      bets.reduce((total, current) => total + parseFloat(current.subtotal), 0),
    );
  }, [bets]);

  useEffect(() => {
    // Define a function to recalculate the current draw
    const recalculateCurrentDraw = () => {
      const currentDraw = getCurrentDraw(betType.draws);
      //Check if currentDraw is not null
      if (currentDraw !== null) setCurrentDraw(currentDraw);
      else props.navigation.goBack();
    };

    // Recalculate current draw initially when the component mounts
    recalculateCurrentDraw();

    // Set up interval for periodic recalculation (every 60 seconds)
    const intervalId = setInterval(recalculateCurrentDraw, 60000);

    // Clean up interval when the component unmounts
    return () => {
      clearInterval(intervalId);
    };
  }, [betType]);

  const onKeyPress = (input: string) => {
    // Map first if what is focused
    if (betNumber.isFocus && betNumber.value.length < 3) {
      setBetNumber(prevState => ({
        ...prevState,
        value: prevState.value + input,
      }));
    } else if (targetAmount.isFocus && targetAmount.value.length < 3) {
      setTargetAmount(prevState => ({
        ...prevState,
        value: prevState.value + input,
      }));
    } else if (rambolAmount.isFocus && rambolAmount.value.length < 3) {
      if (!checkIfTriple(betNumber.value))
        setRambolAmount(prevState => ({
          ...prevState,
          value: prevState.value + input,
        }));
      else
        Alert.alert(
          'Triple Digit',
          'You cannot enter rambol amount if tripple digit.',
          [{text: 'OK', onPress: () => console.log('OK Pressed')}],
          {cancelable: false},
        );
    }
  };

  const changeFocus = (type: string) => {
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
  };

  const onBackSpace = () => {
    if (betNumber.isFocus && betNumber.value.length > 0) {
      setBetNumber(prevState => ({
        ...prevState,
        value: prevState.value.slice(0, -1),
      }));
    } else if (targetAmount.isFocus && targetAmount.value.length > 0) {
      setTargetAmount(prevState => ({
        ...prevState,
        value: prevState.value.slice(0, -1),
      }));
    } else if (targetAmount.isFocus && targetAmount.value.length === 0) {
      changeFocus('betNumber');
    } else if (rambolAmount.isFocus && rambolAmount.value.length > 0) {
      setRambolAmount(prevState => ({
        ...prevState,
        value: prevState.value.slice(0, -1),
      }));
    } else if (rambolAmount.isFocus && rambolAmount.value.length === 0) {
      {
        changeFocus('targetAmount');
        bottomDrawerRef?.current?.open(hp(45));
      }
    }
  };

  const onClear = () => {
    if (betNumber.isFocus) {
      setBetNumber(prevState => ({
        ...prevState,
        value: '',
      }));
    } else if (targetAmount.isFocus) {
      setTargetAmount(prevState => ({
        ...prevState,
        value: '',
      }));
    } else if (rambolAmount.isFocus) {
      setRambolAmount(prevState => ({
        ...prevState,
        value: '',
      }));
    }
  };

  const onNext = () => {
    if (targetAmount.isFocus && !checkIfTriple(betNumber.value)) {
      setTargetAmount(prevState => ({
        ...prevState,
        value: '0',
      }));
      changeFocus('rambolAmount');
    } else if (targetAmount.isFocus && checkIfTriple(betNumber.value)) {
      addBet();
    }
  };

  const onNoRambol = () => {
    if (targetAmount.isFocus) {
      addBet();
    }
  };

  const showAlert = (item: Bet) => {
    Alert.alert(
      'Remove Bet',
      'Are you sure you want to remove this bet?',
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Cancel Pressed'),
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: () => removeBet(item),
        },
      ],
      {cancelable: false},
    );
  };

  const addBet = () => {
    if (betNumber.value && (targetAmount.value || rambolAmount.value)) {
      setBets(prevState => [
        {
          betNumber: betNumber.value,
          betNumberr: sortNumber(betNumber.value),
          tranno: bets.length + 1,
          targetAmount: targetAmount.value === '' ? '0' : targetAmount.value,
          rambolAmount: rambolAmount.value === '' ? '0' : targetAmount.value,
          subtotal: Number(targetAmount.value) + Number(rambolAmount.value),
        },
        ...prevState,
      ]);
      setBetNumber({value: '', isFocus: true});
      setTargetAmount({value: '', isFocus: false});
      setRambolAmount({value: '', isFocus: false});
    } else {
      Alert.alert('Error', 'Please fill in all fields');
    }
  };

  const removeBet = (item: Bet) => {
    setBets(prevState => prevState.filter(bet => bet.id !== item.id));
  };

  const createTransaction = () => {
    if (bets.length <= 0) {
      Alert.alert('Error', 'Please add at least one bet');
    } else {
      getLatestTransaction(betDate, currentDraw, betType.id, trans => {
        let latestTrans = trans;
        let ticketcode =
          '2852' +
          '-' +
          currentDraw +
          betType.id +
          '-' +
          moment().format('YYMMDD-HHmmss');
        let trans_no = latestTrans ? latestTrans.trans_no + 1 : 1;
        let trans_data = convertToTransData(bets);
        const transaction: Transaction = {
          ticketcode: ticketcode,
          betdate: betDate,
          bettime: currentDraw ?? 1,
          bettypeid: betType.id,
          trans_no: trans_no,
          total: totalAmount,
          trans_data: trans_data,
          status: 'saved',
        };
        insertTransaction(transaction, bets, trans => {
          if (trans) {
            listPairedDevices();
            printTransaction(transaction, betType, bets);
            setBets([]);
            setTotalAmount(0);
          }
        });
      });
    }
  };

  return (
    <SafeAreaView style={Styles.backgroundWrapper}>
      <View style={Styles.mainContainer}>
        {/* header */}
        <View style={[Styles.headerContainer, {justifyContent: 'center'}]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => props.navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={40} color="black" />
          </TouchableOpacity>
          <Text style={[Styles.logoText, {fontWeight: 'bold'}]}>
            {betType.name}
          </Text>
          <Text style={Styles.logoText}></Text>
        </View>
        {/* Draw Info */}
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={{width: widthScreen / 3}}>
              <Text style={styles.cardSubTitle}>
                {moment().format('MMM DD, YYYY')}
              </Text>
            </View>
            <View style={styles.verticalLine} />
            <View style={{width: widthScreen / 3}}>
              <Text style={styles.cardSubTitle}>
                {currentDraw === 1
                  ? '1ST DRAW'
                  : currentDraw === 2
                    ? '2ND DRAW'
                    : currentDraw === 3
                      ? '3RD DRAW'
                      : 'BET CLOSED'}
              </Text>
            </View>
            <View style={styles.verticalLine} />
            <View style={{width: widthScreen / 3}}>
              <Text style={styles.cardSubTitle}>ISABELA 01-001-2019</Text>
            </View>
          </View>
        </View>
        {/* Inputs */}
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <TouchableOpacity
              style={styles.inputContainerStyle}
              onPress={() => {
                changeFocus('betNumber');
                bottomDrawerRef?.current?.open(hp(45));
              }}>
              {betNumber.isFocus && (
                // <Animated.View style={{opacity}}>
                <MaterialIcons
                  style={styles.backButton}
                  name="arrow-forward"
                  size={25}
                  color="black"
                />
                // </Animated.View>
              )}
              <Text style={styles.inputTextStyle}>{betNumber.value}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.inputContainerStyle}
              onPress={() => {
                changeFocus('targetAmount');
                bottomDrawerRef?.current?.open(hp(45));
              }}>
              {targetAmount.isFocus && (
                // <Animated.View style={{opacity}}>
                <MaterialIcons
                  style={styles.backButton}
                  name="arrow-forward"
                  size={25}
                  color="black"
                />
                // </Animated.View>
              )}
              <Text style={styles.inputTextStyle}>{targetAmount.value}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.inputContainerStyle}
              onPress={() => {
                changeFocus('rambolAmount');
                bottomDrawerRef?.current?.open(hp(45));
              }}>
              {rambolAmount.isFocus && (
                // <Animated.View style={{opacity}}>
                <MaterialIcons
                  style={styles.backButton}
                  name="arrow-forward"
                  size={25}
                  color="black"
                />
                // </Animated.View>
              )}
              <Text style={styles.inputTextStyle}>{rambolAmount.value}</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Total */}
        <View style={[Styles.headerContainer, {justifyContent: 'center'}]}>
          <Text style={Styles.logoText}>Total:</Text>
          <Text
            style={[
              Styles.logoText,
              {fontWeight: 'bold', color: Colors.mediumGreen},
            ]}>
            {totalAmount}
          </Text>
        </View>
        {/* Bet List */}
        <FlatList data={bets} renderItem={renderItem} />
        {/* Keyboard */}
        <View style={styles.keyBoardWrapper}>
          <TouchableOpacity
            style={styles.showKeyBoard}
            onPress={() => bottomDrawerRef?.current?.open(hp(45))}>
            <MaterialIcons name="dialpad" size={30} color="white" />
          </TouchableOpacity>
        </View>
        <BottomDrawer
          ref={bottomDrawerRef}
          backdropOpacity={0}
          openOnMount
          initialHeight={hp(45)}>
          <View style={styles.keyboardContainer}>
            <View style={styles.wrapper}>
              {/* 1 */}
              <View style={styles.keyBoardWrapper}>
                <TouchableOpacity
                  style={styles.keyButtonWrapper}
                  onPress={() => onKeyPress('1')}>
                  <Text style={[styles.keyButtonText]}>{'1'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.keyButtonWrapper}
                  onPress={() => onKeyPress('2')}>
                  <Text style={styles.keyButtonText}>{'2'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.keyButtonWrapper}
                  onPress={() => onKeyPress('3')}>
                  <Text style={styles.keyButtonText}>{'3'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onLongPress={() => {}}
                  onPress={() => onNext()}
                  style={[
                    styles.keyButtonWrapper,
                    {backgroundColor: Colors.teal},
                  ]}>
                  <MaterialIcons
                    style={styles.keyButtonText}
                    name="arrow-forward"
                    size={20}
                  />
                </TouchableOpacity>
              </View>

              {/* 2 */}
              <View style={styles.keyBoardWrapper}>
                <TouchableOpacity
                  style={styles.keyButtonWrapper}
                  onPress={() => onKeyPress('4')}>
                  <Text style={styles.keyButtonText}>{'4'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.keyButtonWrapper}
                  onPress={() => onKeyPress('5')}>
                  <Text style={[styles.keyButtonText]}>{'5'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.keyButtonWrapper}
                  onPress={() => onKeyPress('6')}>
                  <Text style={styles.keyButtonText}>{'6'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onLongPress={() => {}}
                  onPress={() => onNoRambol()}
                  style={[
                    styles.keyButtonWrapper,
                    {backgroundColor: Colors.mediumYellow},
                  ]}>
                  <Text style={styles.keyButtonText}>{'NR'}</Text>
                </TouchableOpacity>
              </View>

              {/* 3 */}
              <View style={styles.keyBoardWrapper}>
                <TouchableOpacity
                  style={styles.keyButtonWrapper}
                  onPress={() => onKeyPress('7')}>
                  <Text style={styles.keyButtonText}>{'7'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.keyButtonWrapper}
                  onPress={() => onKeyPress('8')}>
                  <Text style={styles.keyButtonText}>{'8'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.keyButtonWrapper}
                  onPress={() => onKeyPress('9')}>
                  <Text style={styles.keyButtonText}>{'9'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onLongPress={() => {}}
                  onPress={() => addBet()}
                  style={[
                    styles.keyButtonWrapper,
                    {backgroundColor: Colors.mediumBlue},
                  ]}>
                  <MaterialIcons
                    style={styles.keyButtonText}
                    name="subdirectory-arrow-left"
                    size={20}
                  />
                </TouchableOpacity>
              </View>

              {/* 4 */}
              <View style={styles.keyBoardWrapper}>
                <TouchableOpacity
                  onLongPress={() => {}}
                  onPress={() => onClear()}
                  style={[styles.keyButtonWrapper, {backgroundColor: 'white'}]}>
                  <Text
                    style={[
                      styles.keyButtonText,
                      {color: Colors.primaryColor, fontWeight: 'bold'},
                    ]}>
                    {'C'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.keyButtonWrapper}
                  onPress={() => onKeyPress('0')}>
                  <Text style={styles.keyButtonText}>{'0'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onLongPress={() => {}}
                  onPress={() => onBackSpace()}
                  style={[styles.keyButtonWrapper, {backgroundColor: 'white'}]}>
                  <MaterialIcons
                    style={[styles.keyButtonText, {color: Colors.primaryColor}]}
                    name="backspace"
                    size={20}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onLongPress={() => {}}
                  onPress={() => {
                    createTransaction();
                  }}
                  style={[
                    styles.keyButtonWrapper,
                    {backgroundColor: Colors.mediumGreen},
                  ]}>
                  <MaterialIcons
                    style={styles.keyButtonText}
                    name="done-all"
                    size={20}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </BottomDrawer>
        <View style={Styles.line} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    marginTop: 30,
  },

  backButton: {
    // Option 1: Reduce margin/padding for the button itself
    margin: 0,
    padding: 0,
    marginTop: 8,

    // Option 2: Alternatively, absolute positioning
    position: 'absolute',
    left: 0,
    zIndex: 1, // Ensure the button is on top
  },

  card: {
    height: 60,
    elevation: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  cardTitle: {
    fontSize: 20,
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
    height: '80%', // Adjust height as needed
    width: 1,
    backgroundColor: 'gray',
  },

  container: {
    flex: 3,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },

  keyboardContainer: {
    justifyContent: 'flex-start',
    alignItems: 'center',
  },

  inputContainerStyle: {
    flex: 3,
    borderRadius: 10,
    margin: 5,
    backgroundColor: 'rgba(114, 114, 114, 0.08)',
    height: 60,
    borderWidth: 1,
    borderColor: Colors.primaryColor,
    justifyContent: 'center',
  },

  inputTextStyle: {
    fontSize: 30,
    color: Colors.primaryColor,
    fontWeight: 'bold',
    alignSelf: 'center',
    textTransform: 'uppercase',
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
  },

  keyBoardWrapper: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: hp(0.2),
    height: hp(9),
  },

  keyButtonText: {
    fontSize: 30,
    fontFamily: 'Nunito-ExtraBold',
    color: Colors.White,
  },

  showKeyBoard: {
    width: wp(97),
    marginTop: hp(1),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: Colors.primaryColor,
  },
});

export default TransacScreen;
