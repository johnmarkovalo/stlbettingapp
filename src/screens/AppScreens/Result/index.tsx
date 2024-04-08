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
  ActivityIndicator,
  RefreshControl,
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
import Ionic from 'react-native-vector-icons/Ionicons';
import {
  getResult,
  getWinners,
  updateTransactionStatus,
  insertResult,
  getTransactionByTicketCode,
  getWinningTransactionBets,
} from '../../../helper/sqlite.ts';
import {useSelector} from 'react-redux';
import {checkTransactionAPI, syncResultAPI} from '../../../helper/api.ts';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';

const widthScreen = Dimensions.get('window').width;
const heightScreen = Dimensions.get('window').height;

const Result = (props: any) => {
  const {navigation} = props;
  const internetStatusCheck = useRef(checkInternetConnection());
  const token = useSelector(state => state.auth.token);
  const [enableQRCam, setEnableQRCam] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [cameraDevice, setCameraDevice] = useState(useCameraDevice('back'));
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState({title: '', message: ''});
  const [betModalVisible, setBetModalVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [drawModalVisible, setDrawModalVisible] = useState(false);
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  //Date
  const [betDate, setBetDate] = useState<Date>(moment().toDate());
  const minDate = moment().subtract(1, 'weeks').toDate();
  const maxDate = moment().toDate();
  //Type
  const betTypes = useSelector(state => state.types.types);
  const [betTypeId, setBetTypeId] = useState(2);
  const [betType, setBetType] = useState(betTypes[0]);
  //Draw
  const [draw, setDraw] = useState(getCurrentDraw(betTypes[0].draws ?? 1));
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
      console.log(ticketcode);
      if (!internetStatusCheck.current.isConnected()) {
        Alert.alert('No internet connection');
      }
      if (!enableQRCam) {
        let response = await checkTransactionAPI(ticketcode, token);
        if (response) {
          setAlertModalVisible(true);
          setModalMessage({
            title: 'Scanned Ticket',
            message: response.message,
          });
        }
      }
      // if (enableQRCam) return;
      // //Check if ticketcode exists in transactions
      // getTransactionByTicketCode(ticketcode, transaction => {
      //   if (transaction) {
      //     console.log('valid ticket');
      //     getWinningTransactionBets(transaction.id, result, bets => {
      //       console.log(bets);
      //       if (bets) {
      //         updateTransactionStatus(transaction.id, 'scanned');
      //         Alert.alert('Valid Winning ticket');
      //       } else {
      //         Alert.alert('Valid ticket, But not a winning ticket');
      //       }
      //     });
      //   } else {
      //     if (!internetStatusCheck.current.isConnected()) {
      //       console.error('Error', 'No internet connection');
      //       return;
      //     }
      //     if (internetStatusCheck.current.isSlow()) {
      //       console.error('Error', 'Slow internet connection');
      //       return;
      //     }
      //     checkTransactionAPI(ticketcode, token, transaction => {
      //       if (transaction) {
      //         console.log(transaction);
      //       } else {
      //         Alert.alert('invalid Ticket');
      //         console.log('transaction not found in server db');
      //       }
      //     });
      //   }
      // });
    } catch (e) {
      console.error(e.message);
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      setEnableQRCam(false);
      if (codes[0].value.length === 21) {
        processQR(codes[0].value);
      } else Alert.alert('Invalid QR code');
    },
  });

  const fetchData = async () => {
    setRefresh(true);

    try {
      setBetType(betTypes.find(item => item.bettypeid === betTypeId));
      const localResult = await getResult(
        moment(betDate).format('YYYY-MM-DD'),
        draw,
        betTypeId,
      );

      if (localResult) {
        setResult(localResult);
        await getNewWinners(localResult);
      } else {
        if (
          !internetStatusCheck.current.isConnected() ||
          internetStatusCheck.current.isSlow()
        ) {
          console.error('Error', 'No/Slow internet connection');
          setResult({result: 0});
          setTransactions([]);
          return;
        }

        const serverResult = await syncResultAPI(
          token,
          betTypeId,
          draw,
          moment(betDate).format('YYYY-MM-DD'),
        );

        if (serverResult) {
          await insertResult(serverResult); // Assuming insertResult returns a Promise
          setResult(serverResult);
          await getNewWinners(serverResult);
        } else {
          setResult({result: 0});
          setTransactions([]);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      // Handle the error appropriately (e.g., display an error message)
    } finally {
      setRefresh(false);
    }
  };

  const onRefresh = () => {
    setRefresh(true);
    fetchData();
    setTimeout(() => {
      setRefresh(false);
    }, 1000); // Refresh indicator will be visible for at least 1 second
  };

  useEffect(() => {
    setBetTypeId(betTypes[0].bettypeid);
    setDraw(getCurrentDraw(betTypes[0].draws) ?? 1);
  }, []);

  useEffect(() => {
    fetchData();
  }, [betDate, betTypeId, draw]);

  useEffect(() => {
    navigation.addListener('focus', () => {
      fetchData();
    });
  }, [navigation]);

  async function getNewWinners(newResult) {
    if (newResult.result === 0 || betType === null) return;
    const transactions = await getWinners(betType, newResult);
    if (transactions.length > 0) {
      setTransactions(transactions);
      let total = 0;
      transactions.map(item => {
        total += item.total;
      });
      setTotalAmount(total);
    } else {
      setTransactions([]);
      setTotalAmount(0);
    }
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

  const hideAlertModal = () => {
    setAlertModalVisible(false);
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
        visible={alertModalVisible}
        onRequestClose={betModalHide}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            {/* Header */}
            <View style={styles.modalHeaderContainer}>
              <Text style={styles.modalTitle}>{modalMessage.title}</Text>
              <TouchableOpacity
                onPress={hideAlertModal}
                style={{
                  padding: 10,
                  alignSelf: 'flex-end',
                  position: 'absolute',
                }}>
                <Ionic
                  name="close"
                  size={30}
                  style={{
                    color: '#000',
                  }}
                />
              </TouchableOpacity>
            </View>
            {/* Bet List */}
            <View style={styles.modalBodyContainer}>
              <Text style={styles.alertText}>{modalMessage.message}</Text>
            </View>
          </View>
        </View>
      </Modal>
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
        {refresh && <ActivityIndicator />}
        {!refresh && (
          <View style={styles.hitsContainer}>
            <Text style={[{fontSize: 25, color: Colors.Black, marginRight: 5}]}>
              Hits:
              <Text
                style={[
                  {
                    fontWeight: 'bold',
                    fontSize: 30,
                    color: Colors.primaryColor,
                  },
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
        )}
        {/* Transaction List */}
        {!refresh && transactions.length > 0 && (
          <FlatList
            data={transactions}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={refresh} onRefresh={onRefresh} />
            }
          />
        )}
        {!refresh && transactions.length == 0 && result.result !== 0 && (
          <View style={styles.container}>
            <Text
              style={[
                {fontWeight: 'bold', fontSize: 30, color: Colors.mediumBlue},
              ]}>
              No Winners
            </Text>
          </View>
        )}
        {!refresh && result.result === 0 && (
          <View style={styles.container}>
            <Text
              style={[
                {fontWeight: 'bold', fontSize: 30, color: Colors.mediumBlue},
              ]}>
              No Result Yet
            </Text>
          </View>
        )}
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

  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    // marginTop: 22,
    width: widthScreen,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalView: {
    // margin: 15,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    height: heightScreen * 0.4,
    width: widthScreen * 0.9,
  },
  modalHeaderContainer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: widthScreen * 0.9,
    padding: 10,
    alignSelf: 'center',
  },
  modalBodyContainer: {
    flex: 1,
    padding: 1,
  },
  modalTitle: {
    alignSelf: 'center',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Black,
  },
  alertText: {
    alignSelf: 'center',
    textAlign: 'center',
    fontSize: 22,
    color: Colors.Black,
  },
});

export default Result;
