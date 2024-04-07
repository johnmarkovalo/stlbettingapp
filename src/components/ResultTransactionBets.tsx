import React, {useState, useEffect, useContext} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Text,
  FlatList,
} from 'react-native';
import Ionic from 'react-native-vector-icons/Ionicons';
import Colors from '../Styles/Colors';
import Bet from '../models/Bet';
import {TransactionBetItem} from './TransactionBetItem';
import {formatNumberWithCommas} from '../helper';
import {
  closeDatabaseConnection,
  getWinningTransactionBets,
} from '../helper/sqlite';

const widthScreen = Dimensions.get('window').width;
const heightScreen = Dimensions.get('window').height;

const ResultTransactionBets = ({hide, result, transaction}: any) => {
  const [totalAmount, setTotalAmount] = useState(0);
  const [bets, setBets] = useState<Bet[]>([]);

  const renderItem = ({item}: {item: Bet}) => {
    const index = bets.indexOf(item);
    return <TransactionBetItem item={item} index={index} onPress={() => {}} />;
  };

  useEffect(() => {
    getWinningTransactionBets(transaction.id, result, bets => {
      console.log('bets', bets);
      setBets(bets);
    });
  }, [transaction]);

  useEffect(() => {
    let total = 0;
    bets.map(item => {
      total += item.subtotal;
    });
    setTotalAmount(total);
  }, [bets]);

  useEffect(() => {
    return () => {
      closeDatabaseConnection();
    };
  }, []);

  function hideModal() {
    hide();
  }

  return (
    <View style={styles.centeredView}>
      <View style={styles.modalView}>
        {/* Header */}
        <View style={styles.modalHeaderContainer}>
          <Text style={styles.modalTitle}>{transaction.ticketcode}</Text>
          <TouchableOpacity
            onPress={hide}
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
          {/* Total */}
          <View
            style={{
              justifyContent: 'center',
              flexDirection: 'row',
              alignItems: 'center',
            }}>
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
          <FlatList data={bets} renderItem={renderItem} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
    height: heightScreen * 0.6,
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
  totalAmountStyle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Black,
    alignSelf: 'center',
    textAlign: 'center',
  },
});

export default ResultTransactionBets;
