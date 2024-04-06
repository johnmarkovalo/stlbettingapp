import React, {useEffect, useRef, useState} from 'react';
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
} from 'react-native';

import Styles from './Styles';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import Colors from '../../../Styles/Colors.ts';
import Transaction from '../../../models/Transaction.ts';
import {TransactionItem} from '../../../components/transactionItem.tsx';
import {
  checkInternetConnection,
  formatNumberWithCommas,
  getCurrentDraw,
} from '../../../helper';
import TransactionBets from '../../../components/TransactionBets.tsx';
import DatePicker from 'react-native-date-picker';
import moment from 'moment';
import DrawModal from '../../../components/DrawModal.tsx';
import TypeModal from '../../../components/TypeModal.tsx';
import {useSelector, useDispatch} from 'react-redux';
import {typesActions} from '../../../store/actions';
import {
  getTransactions,
  closeDatabaseConnection,
  getActiveTypes,
  updateTransactionStatus,
  getBetsByTransaction,
} from '../../../helper/sqlite.ts';
import Type from '../../../models/Type.ts';
import {listPairedDevices, printSales} from '../../../helper/printer.js';
import {sendTransactionAPI} from '../../../helper/api.ts';

const widthScreen = Dimensions.get('window').width;

const History = (props: any) => {
  const {navigation} = props;
  const internetStatusCheck = useRef(checkInternetConnection());
  const user = useSelector(state => state.auth.user);
  const token = useSelector(state => state.auth.token);
  const betTypes = useSelector(state => state.types.types);
  const dispatch = useDispatch();
  const [betModalVisible, setBetModalVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [drawModalVisible, setDrawModalVisible] = useState(false);
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  //Date
  const [betDate, setBetDate] = useState<Date>(moment().toDate());
  const minDate = moment().subtract(1, 'weeks').toDate();
  const maxDate = moment().toDate();
  //Draw
  const [draw, setDraw] = useState(1);
  //Type
  const [type, setType] = useState(2);
  function typeLabel() {
    const matchingItems: Type[] = betTypes.filter(
      (item: Type) => item.bettypeid === type,
    );
    return matchingItems.length > 0 ? matchingItems[0].name : null;
  }
  //Transaction
  const [totalAmount, setTotalAmount] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction>();

  useEffect(() => {
    // Define the criteria for fetching transactions
    getActiveTypes((types: Type[]) => {
      dispatch(typesActions.update(types));
      setType(types[0].bettypeid);
      setDraw(getCurrentDraw(types[0].draws) ?? 1);
    });
  }, []);

  useEffect(() => {
    getTransactions(
      moment(betDate).format('YYYY-MM-DD'),
      draw,
      type,
      transactions => {
        setTransactions(transactions);
        console.log('History transactions:', transactions);
      },
    );
  }, [betDate, type, draw]);

  useEffect(() => {
    return () => {
      closeDatabaseConnection();
    };
  }, []);

  const renderItem = ({item}: {item: Transaction}) => {
    return (
      <TransactionItem
        item={item}
        onLongPress={() => {
          resendTransaction(item);
        }}
        onPress={() => {
          betModalShow(item);
        }}
      />
    );
  };

  useEffect(() => {
    let total = 0;
    transactions.map(item => {
      total += item.total;
    });
    setTotalAmount(total);
  }, [transactions]);

  //Modals
  const betModalHide = () => {
    setBetModalVisible(!betModalVisible);
  };

  const betModalShow = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setBetModalVisible(true);
  };

  const drawModalHide = () => {
    setDrawModalVisible(!drawModalVisible);
    // setNote({id: null, note: null});
  };

  const drawModalShow = () => {
    setDrawModalVisible(true);
  };

  const typeModalHide = () => {
    setTypeModalVisible(!typeModalVisible);
    // setNote({id: null, note: null});
  };

  const typeModalShow = () => {
    setTypeModalVisible(true);
  };

  const resendTransaction = (transaction: Transaction) => {
    if (internetStatusCheck.current.isConnected()) {
      getBetsByTransaction(transaction.id, bets => {
        let newTransaction = {
          ...transaction,
          trans_data: transaction.transdata,
          status: 'VALID',
          gateway: 'Retrofit',
          keycode: user.keycode,
          remarks: '',
          printed_at: transaction.created_at,
          declared_gross: totalAmount,
          bets: bets,
        };
        console.log(newTransaction);
        sendTransactionAPI(token, newTransaction, (result: any) => {
          updateTransactionStatus(newTransaction.id, 'synced');
          setTransactions(prevTransactions =>
            prevTransactions.map((item: Transaction) => {
              if (item.ticketcode === newTransaction.ticketcode) {
                return {...item, status: 'synced'}; // Update only matching item
              } else {
                return item; // Preserve other items
              }
            }),
          );
        });
      });
      // Alert.alert('Printed');
    } else {
      Alert.alert('No internet connection');
    }
  };

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
          transaction={selectedTransaction}
        />
      </Modal>
      <DatePicker
        modal
        open={dateModalVisible}
        date={betDate}
        onConfirm={date => {
          setDateModalVisible(false);
          setBetDate(date);
        }}
        mode="date"
        maximumDate={maxDate}
        minimumDate={minDate}
        onCancel={() => {
          setDateModalVisible(false);
        }}
      />
      <Modal
        animationType="fade"
        transparent={true}
        visible={drawModalVisible}
        onRequestClose={drawModalHide}>
        <DrawModal hide={drawModalHide} draw={draw} setDraw={setDraw} />
      </Modal>
      <Modal
        animationType="fade"
        transparent={true}
        visible={typeModalVisible}
        onRequestClose={typeModalHide}>
        <TypeModal
          hide={typeModalHide}
          type={type}
          types={betTypes}
          setType={setType}
        />
      </Modal>
      {/* Main */}
      <View style={Styles.mainContainer}>
        {/* Header */}
        <View style={Styles.headerContainer}>
          <Text style={Styles.logoText}>{'History'}</Text>
        </View>
        {/* Conditions */}
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <TouchableOpacity
              onPress={() => setDateModalVisible(true)}
              style={{width: widthScreen / 3}}>
              <Text style={styles.cardTitle}>DATE</Text>
              <Text style={styles.cardSubTitle}>
                {moment(betDate).format('MMM DD, YYYY')}
              </Text>
            </TouchableOpacity>
            <View style={styles.verticalLine} />
            <TouchableOpacity
              onPress={drawModalShow}
              style={{width: widthScreen / 3}}>
              <Text style={styles.cardTitle}>TIME</Text>
              <Text style={styles.cardSubTitle}>
                {draw === 1 ? '1ST DRAW' : draw === 2 ? '2ND DRAW' : '3RD DRAW'}
              </Text>
            </TouchableOpacity>
            <View style={styles.verticalLine} />
            <TouchableOpacity
              onPress={typeModalShow}
              style={{width: widthScreen / 3}}>
              <Text style={styles.cardTitle}>Type</Text>
              <Text style={styles.cardSubTitle}>{typeLabel()}</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Total */}
        <View style={[styles.container, {justifyContent: 'center'}]}>
          <Text style={[{fontSize: 20, color: Colors.Black, marginRight: 5}]}>
            Total:
          </Text>
          <Text
            style={[
              {fontWeight: 'bold', fontSize: 30, color: Colors.mediumGreen},
            ]}>
            {formatNumberWithCommas(totalAmount)}
          </Text>
        </View>
        {/* Transaction List */}
        <FlatList data={transactions} renderItem={renderItem} />
        <View style={Styles.line} />
        {/* Print Sales */}
        {transactions.length > 0 && (
          <TouchableOpacity
            style={styles.buttonStyle}
            onPress={() => {
              listPairedDevices();
              printSales(betDate, draw, typeLabel(), totalAmount);
            }}>
            <Text style={styles.buttonTextStyle}>Print Sales</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

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
    height: '80%', // Adjust height as needed
    width: 1,
    backgroundColor: 'gray',
  },

  container: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },

  button: {
    elevation: 8,
    backgroundColor: Colors.primaryColor,
    borderRadius: 100,
    padding: 10,
    margin: 10,
    height: 60,
    width: widthScreen * 0.8,
    justifyContent: 'center',
  },

  textStyle: {
    fontSize: 30,
    color: '#fff',
    fontWeight: 'bold',
    alignSelf: 'center',
    textTransform: 'uppercase',
  },

  buttonStyle: {
    width: wp(97),
    marginVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 10,
    height: 50,
    backgroundColor: Colors.primaryColor,
  },

  buttonTextStyle: {
    fontSize: 30,
    color: Colors.White,
    fontWeight: 'bold',
    alignSelf: 'center',
    textTransform: 'uppercase',
  },

  //Modal
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default History;
