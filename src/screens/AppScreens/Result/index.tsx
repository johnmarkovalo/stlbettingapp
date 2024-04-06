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
import {ResultTransactionItem} from '../../../components/ResultTransactionItem.tsx';
import {
  checkInternetConnection,
  formatNumberWithCommas,
  getCurrentDraw,
} from '../../../helper';
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
  insertResult,
  getTransactionByTicketCode,
  getBetsByTransaction,
  getWinningTransactionBets,
} from '../../../helper/sqlite.ts';
import {useSelector} from 'react-redux';
import {checkTransactionAPI, syncResultAPI} from '../../../helper/api.ts';
import RNQRGenerator from 'rn-qr-generator';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';

import LinearGradient from 'react-native-linear-gradient';
import _ from 'lodash';
import {types} from '../../../store/reducers/types.reducer.ts';

const widthScreen = Dimensions.get('window').width;

const Result = (props: any) => {
  const {navigation} = props;
  const internetStatusCheck = useRef(checkInternetConnection());
  const token = useSelector(state => state.auth.token);
  const [enableQRCam, setEnableQRCam] = useState(false);
  const [cameraDevice, setCameraDevice] = useState(useCameraDevice('back'));
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
  const betTypes = useSelector(state => state.types.types);
  const [betTypeId, setBetTypeId] = useState(2);
  const [betType, setBetType] = useState(betTypes[0]);
  function typeLabel() {
    const matchingItems: Type[] = betTypes.filter(
      (item: Type) => item.bettypeid === betTypeId,
    );
    return matchingItems.length > 0 ? matchingItems[0].name : null;
  }
  //Result
  const [result, setResult] = useState({result: 0});
  //Transaction
  const [totalAmount, setTotalAmount] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const processQR = async (ticketcode: string) => {
    try {
      //Count ticketcode length
      console.log(ticketcode);
      const ticketCodeLength = ticketcode.length;
      if (ticketCodeLength !== 21) {
        Alert.alert('Invalid QR code');
        return;
      } else {
        console.log('valid QR code');
        //Check if ticketcode exists in transactions
        getTransactionByTicketCode(ticketcode, transaction => {
          if (transaction) {
            console.log('valid ticket');
            getWinningTransactionBets(transaction.id, result, bets => {
              console.log(bets);
              if (bets) {
                updateTransactionStatus(transaction.id, 'scanned');
                Alert.alert('Valid Winning ticket');
              } else {
                Alert.alert('Valid ticket, But not a winning ticket');
              }
            });
          } else {
            if (!internetStatusCheck.current.isConnected()) {
              console.error('Error', 'No internet connection');
              return;
            }
            if (internetStatusCheck.current.isSlow()) {
              console.error('Error', 'Slow internet connection');
              return;
            }
            checkTransactionAPI(ticketcode, token, transaction => {
              if (transaction) {
                console.log(transaction);
              } else {
                Alert.alert('invalid Ticket');
                console.log('transaction not found in server db');
              }
            });
          }
        });
      }
      // const qr_token = await RNQRGenerator.generate({
      //   value: ticketcode,
      //   size: 500,
      // axios
      //   .post(appConfig.apiUrl + 'login', {
      //     encodedString: qr_token,
      //   })
      //   .then((response: any) => {
      //     console.log(response.data);
      //     if (response?.data?.token) {
      //       dispatch(
      //         userActions.login(response.data.agent, response.data.token),
      //       );
      //     } else {
      //       alert('Invalid QR code');
      //     }
      //   });
    } catch (e) {
      console.error(e.message);
    }
  };

  const debounceCodeScanned = _.debounce(codes => {
    setEnableQRCam(false);
    processQR(codes[0].value);
  }, 300);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: debounceCodeScanned,
  });

  useEffect(() => {
    setBetTypeId(betTypes[0].bettypeid);
    setDraw(getCurrentDraw(betTypes[0].draws) ?? 1);
  }, []);

  useEffect(() => {
    setBetType(betTypes.find(item => item.bettypeid === betTypeId));
    getResult(
      moment(betDate).format('YYYY-MM-DD'),
      draw,
      betTypeId,
      localResult => {
        console.log('result_local', localResult);
        if (localResult) {
          setResult(localResult);
          getNewWinners(localResult);
        } else {
          if (!internetStatusCheck.current.isConnected()) {
            console.error('Error', 'No internet connection');
            return;
          }
          if (internetStatusCheck.current.isSlow()) {
            console.error('Error', 'Slow internet connection');
            return;
          }

          syncResultAPI(
            token,
            betTypeId,
            draw,
            moment(betDate).format('YYYY-MM-DD'),
            (serverResult: any) => {
              if (serverResult) {
                console.log('result_server', serverResult);
                insertResult(serverResult, (resultId: number) => {});
                setResult(serverResult);
                getNewWinners(serverResult);
              } else {
                setResult({result: 0});
                setTransactions([]);
              }
            },
          );
        }
      },
    );
  }, [betDate, betTypeId, draw]);

  useEffect(() => {
    return () => {
      closeDatabaseConnection();
    };
  }, []);

  function getNewWinners(newResult) {
    if (newResult.result === 0 || betType === null) return;
    getWinners(betType, newResult, transactions => {
      console.log('transactions', transactions);
      if (transactions.length > 0) {
        setTransactions(transactions);
      } else setTransactions([]);
    });
  }

  function scanTicket(ticketcode: string) {
    getTransactionByTicketCode(ticketcode, transaction => {
      console.log('transaction', transaction);
    });
  }

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
          //   betTypeId,
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

  if (enableQRCam) {
    return (
      <View style={{flex: 1}}>
        <Camera
          codeScanner={codeScanner}
          style={Styles.cameraStyle}
          device={cameraDevice}
          isActive={true}
        />
        <View
          style={{
            flex: 1,
            width: '100%',
            justifyContent: 'flex-end',
          }}>
          <TouchableOpacity
            style={styles.buttonStyle}
            onPress={() => setEnableQRCam(false)}>
            <Text style={Styles.loginBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
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
          type={betTypeId}
          types={betTypes}
          setType={setBetTypeId}
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
        <View style={styles.hitsContainer}>
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
        {transactions.length > 0 && (
          <FlatList data={transactions} renderItem={renderItem} />
        )}
        {transactions.length == 0 && result.result !== 0 && (
          <View style={styles.container}>
            <Text
              style={[
                {fontWeight: 'bold', fontSize: 30, color: Colors.mediumBlue},
              ]}>
              No Winners
            </Text>
          </View>
        )}
        {result.result === 0 && (
          <View style={styles.container}>
            <Text
              style={[
                {fontWeight: 'bold', fontSize: 30, color: Colors.mediumBlue},
              ]}>
              No Result Yet
            </Text>
          </View>
        )}
        <View style={Styles.line} />
        {/* Scan Ticket */}
        <TouchableOpacity
          style={styles.buttonStyle}
          onPress={() => {
            setEnableQRCam(true);
          }}>
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

  hitsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
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
