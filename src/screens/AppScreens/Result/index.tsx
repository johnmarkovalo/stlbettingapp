import React, {useEffect, useState} from 'react';
import {
  Dimensions,
  FlatList,
  SafeAreaView,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Styles from './Styles';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import Colors from '../../../Styles/Colors.ts';
import Transaction from '../../../models/Transaction.ts';
import {ResultTransactionItem} from '../../../components/ResultTransactionItem.tsx';
import {formatNumberWithCommas} from '../../../helper';
import ResultTransactionBets from '../../../components/ResultTransactionBets.tsx';
import DatePicker from 'react-native-date-picker';
import moment from 'moment';
import DrawModal from '../../../components/DrawModal.tsx';
import TypeModal from '../../../components/TypeModal.tsx';
import Type from '../../../models/Type.ts';
import {
  getResult,
  getWinners,
  closeDatabaseConnection,
  getActiveTypes,
  updateTransactionStatus,
} from '../../../helper/sqlite.ts';

const widthScreen = Dimensions.get('window').width;

const Result = (props: any) => {
  const {navigation} = props;
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
  const [betTypes, setBetTypes] = useState([]);
  function typeLabel() {
    const matchingItems: Type[] = betTypes.filter(
      (item: Type) => item.id === type,
    );
    return matchingItems.length > 0 ? matchingItems[0].name : null;
  }
  //Result
  const [result, setResult] = useState({result: 0});
  //Transaction
  const [totalAmount, setTotalAmount] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  useEffect(() => {
    // Define the criteria for fetching transactions
    getActiveTypes((types: Type[]) => {
      setBetTypes(types);
      setType(types[0].id);
      setDraw(getCurrentDraw(types[0].draws) ?? 1);
    });
  }, []);

  useEffect(() => {
    getResult(moment(betDate).format('YYYY-MM-DD'), draw, type, result => {
      console.log('result', result);
      if (result) {
        setResult(result);
        getWinners(
          moment(betDate).format('YYYY-MM-DD'),
          draw,
          type,
          result,
          transactions => {
            console.log('transactions', transactions);
            if (transactions.length > 0) {
              setTransactions(transactions);
            } else setTransactions([]);
          },
        );
      } else {
        setResult({result: 0});
        setTransactions([]);
      }
    });
  }, [betDate, type, draw]);

  useEffect(() => {
    return () => {
      closeDatabaseConnection();
    };
  }, []);

  const renderItem = ({item}: {item: any}) => {
    return (
      <ResultTransactionItem
        item={item}
        onPress={() => {
          betModalShow(item);
        }}
        onLongPress={() => {
          // updateTransactionStatus(item.id, 'scanned');
          // getWinners(
          //   moment(betDate).format('YYYY-MM-DD'),
          //   draw,
          //   type,
          //   result,
          //   transactions => {
          //     console.log('transactions', transactions);
          //     if (transactions.length > 0) {
          //       setTransactions(transactions);
          //     } else setTransactions([]);
          //   },
          // );
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
    // setNote({id: null, note: null});
  };

  const betModalShow = (transaction: any) => {
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

  return (
    <SafeAreaView style={Styles.backgroundWrapper}>
      <Modal
        animationType="fade"
        transparent={true}
        visible={betModalVisible}
        onRequestClose={betModalHide}>
        <ResultTransactionBets
          hide={betModalHide}
          result={result}
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
      <View style={Styles.mainContainer}>
        <View style={Styles.headerContainer}>
          <Text style={Styles.logoText}>{'Result'}</Text>
        </View>
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
        {/* Hits */}
        <View style={styles.container}>
          <Text style={[{fontSize: 25, color: Colors.Black, marginRight: 5}]}>
            Hits:
            <Text
              style={[
                {fontWeight: 'bold', fontSize: 30, color: Colors.primaryColor},
              ]}>
              {' ' + formatNumberWithCommas(totalAmount)}
            </Text>
          </Text>
          <Text style={[{fontSize: 25, color: Colors.Black, marginRight: 5}]}>
            Result:
            <Text
              style={[
                {fontWeight: 'bold', fontSize: 30, color: Colors.mediumBlue},
              ]}>
              {result.result}
            </Text>
          </Text>
        </View>
        {/* Transaction List */}
        <FlatList data={transactions} renderItem={renderItem} />
        <View style={Styles.line} />
        {/* Scan Ticket */}
        <TouchableOpacity style={styles.buttonStyle} onPress={() => {}}>
          <Text style={styles.buttonTextStyle}>Scan Ticket</Text>
        </TouchableOpacity>
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
    justifyContent: 'space-between',
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

export default Result;
