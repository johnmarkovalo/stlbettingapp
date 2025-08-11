import React from 'react';
import {TouchableOpacity, Text, StyleSheet, View} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Transaction from '../models/Transaction';
import Colors from '../Styles/Colors';
import {convertDateTime, formatNumberWithCommas} from '../helper';

interface ResultTransactionItemProps {
  item: Transaction;
  onPress: () => void;
  onLongPress: () => void;
}

const ResultTransactionItem: React.FC<ResultTransactionItemProps> = React.memo(
  ({item, onPress, onLongPress}) => {
    const renderTransactionNumber = () => (
      <Text style={styles.transactionNumber}>{item.trans_no + '. '}</Text>
    );

    const renderTicketCode = () => (
      <Text
        style={
          item.status === 'scanned'
            ? styles.scannedNumberStyle
            : styles.numberStyle
        }>
        {item.ticketcode}
      </Text>
    );

    const renderTransactionInfo = () => (
      <View style={styles.transactionInfo}>
        {renderTicketCode()}
        <Text style={styles.subNumberStyle}>
          {convertDateTime(item.created_at)}
        </Text>
      </View>
    );

    const renderTotal = () => (
      <Text style={styles.totalAmount}>
        {formatNumberWithCommas(item.total)}
      </Text>
    );

    return (
      <View>
        <TouchableOpacity
          style={styles.container}
          onPress={onPress}
          onLongPress={onLongPress}>
          <View style={styles.leftContainer}>
            {renderTransactionNumber()}
            {renderTransactionInfo()}
          </View>
          {renderTotal()}
        </TouchableOpacity>
      </View>
    );
  },
);

ResultTransactionItem.displayName = 'ResultTransactionItem';

const styles = StyleSheet.create({
  container: {
    padding: 5,
    marginVertical: 0,
    marginHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionNumber: {
    color: Colors.darkGrey,
    fontSize: 25,
  },
  transactionInfo: {
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
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.mediumRed,
  },
});

export {ResultTransactionItem};
