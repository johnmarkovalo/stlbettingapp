import React from 'react';
import {TouchableOpacity, Text, StyleSheet, View} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Transaction from '../models/Transaction';
import Colors from '../Styles/Colors';
import moment from 'moment';
import {convertDateTime, formatNumberWithCommas} from '../helper';

type TransactionProps = {
  item: Transaction;
  onPress: () => void;
  onLongPress: () => void;
};

export const TransactionItem = ({
  item,
  onPress,
  onLongPress,
}: TransactionProps) => {
  function checkValid(item) {
    if (item.status === 'synced' || item.status === 'scanned') {
      return true;
    }
    return false;
  }
  return (
    <View>
      <TouchableOpacity
        style={styles.container}
        onPress={onPress}
        onLongPress={onLongPress}>
        <View style={[{flexDirection: 'row', alignItems: 'center'}]}>
          <Text style={[{color: Colors.darkGrey, fontSize: 25}]}>
            {item.trans_no + '. '}
          </Text>
          <View>
            {checkValid(item) && (
              <Text style={styles.numberStyle}>{item.ticketcode}</Text>
            )}
            {!checkValid(item) && (
              <Text style={styles.syncedNumberStyle}>{item.ticketcode}</Text>
            )}
            <Text style={styles.subNumberStyle}>
              {/* {moment(item.created_at, 'hh:mm:ss').format('hh:mm A')} */}
              {convertDateTime(item.created_at)}
            </Text>
          </View>
        </View>
        <Text
          style={[
            styles.numberStyle,
            {color: Colors.mediumGreen, fontSize: 20},
          ]}>
          {formatNumberWithCommas(item.total)}
        </Text>
      </TouchableOpacity>
      <View style={styles.line} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 5,
    marginVertical: 0,
    marginHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  numberContainer: {
    flexDirection: 'column',
  },

  syncedNumberStyle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.mediumRed,
  },

  numberStyle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.Black,
  },

  subNumberStyle: {
    fontSize: 14,
    fontWeight: 'normal',
    color: Colors.darkGrey,
  },

  line: {
    alignSelf: 'center',
    height: 1, // Adjust height as needed
    width: '95%',
    backgroundColor: Colors.darkGrey,
  },
});
