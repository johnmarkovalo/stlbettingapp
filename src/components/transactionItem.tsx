import React from 'react';
import {TouchableOpacity, Text, StyleSheet, View} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Transaction from '../models/Transaction';
import Colors from '../Styles/Colors';
import colors from '../Styles/Colors';
import moment from 'moment';
import {formatNumberWithCommas} from '../helper';

type TransactionProps = {
  item: Transaction;
  onPress: () => void;
};

export const TransactionItem = ({item, onPress}: TransactionProps) => {
  return (
    <View>
      <TouchableOpacity style={styles.container} onPress={onPress}>
        <View style={[{flexDirection: 'row', alignItems: 'center'}]}>
          <Text style={[{color: colors.darkGrey, fontSize: 25}]}>
            {item.trans_no + '. '}
          </Text>
          <View>
            <Text style={styles.numberStyle}>{item.ticketcode}</Text>
            <Text style={styles.subNumberStyle}>
              {moment(item.created_at, 'hh:mm:ss').format('hh:mm A')}
            </Text>
          </View>
        </View>
        <Text
          style={[
            styles.numberStyle,
            {color: colors.mediumGreen, fontSize: 20},
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

  numberStyle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.Black,
  },

  subNumberStyle: {
    fontSize: 14,
    fontWeight: 'normal',
    color: colors.darkGrey,
  },

  line: {
    alignSelf: 'center',
    height: 1, // Adjust height as needed
    width: '95%',
    backgroundColor: colors.darkGrey,
  },
});
