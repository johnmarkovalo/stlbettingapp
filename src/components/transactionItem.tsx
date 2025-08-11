import React from 'react';
import {TouchableOpacity, Text, StyleSheet, View} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Transaction from '../models/Transaction';
import Colors from '../Styles/Colors';
import {convertDateTime, formatNumberWithCommas} from '../helper';

interface TransactionItemProps {
  item: Transaction;
  onPress: () => void;
}

const TransactionItem: React.FC<TransactionItemProps> = React.memo(
  ({item, onPress}) => {
    const isValidStatus = (status: string): boolean => {
      return status === 'synced' || status === 'scanned';
    };

    const renderTicketCode = () => {
      const isValid = isValidStatus(item.status);
      return (
        <Text style={isValid ? styles.numberStyle : styles.syncedNumberStyle}>
          {item.ticketcode}
        </Text>
      );
    };

    const renderTransactionNumber = () => (
      <Text style={styles.transactionNumber}>{item.trans_no + '. '}</Text>
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
        <TouchableOpacity style={styles.container} onPress={onPress}>
          <View style={styles.leftContainer}>
            {renderTransactionNumber()}
            {renderTransactionInfo()}
          </View>
          {renderTotal()}
        </TouchableOpacity>
        <View style={styles.line} />
      </View>
    );
  },
);

TransactionItem.displayName = 'TransactionItem';

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
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.mediumGreen,
  },
  line: {
    alignSelf: 'center',
    height: 1,
    width: '95%',
    backgroundColor: Colors.darkGrey,
  },
});

export {TransactionItem};
