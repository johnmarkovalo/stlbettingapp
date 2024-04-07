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

export const ResultTransactionItem = ({
  item,
  onPress,
  onLongPress,
}: TransactionProps) => {
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
            <Text
              style={
                item.status === 'scanned'
                  ? styles.scannedNumberStyle
                  : styles.numberStyle
              }>
              {item.ticketcode}
            </Text>
            <Text style={styles.subNumberStyle}>
              {convertDateTime(item.created_at)}
            </Text>
          </View>
        </View>
        <Text
          style={[styles.numberStyle, {color: Colors.mediumRed, fontSize: 20}]}>
          {formatNumberWithCommas(item.total)}
        </Text>
      </TouchableOpacity>
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

  numberStyle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.Black,
  },

  scannedNumberStyle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.mediumGreen,
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
