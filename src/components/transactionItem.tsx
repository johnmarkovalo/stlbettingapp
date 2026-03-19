import React from 'react';
import {TouchableOpacity, Text, StyleSheet, View} from 'react-native';
import Transaction from '../models/Transaction';
import {palette} from '../theme/colors';
import {fontFamily, fontSize} from '../theme/typography';
import {spacing} from '../theme/spacing';
import {convertDateTime, formatNumberWithCommas} from '../helper';
import Badge from './shared/Badge';

interface TransactionItemProps {
  item: Transaction;
  onPress: () => void;
}

const TransactionItem: React.FC<TransactionItemProps> = React.memo(
  ({item, onPress}) => {
    const isValidStatus = (status: string): boolean => {
      return status === 'synced' || status === 'scanned';
    };

    const isSynced = isValidStatus(item.status);

    return (
      <View>
        <TouchableOpacity style={styles.container} onPress={onPress}>
          <View style={styles.leftContainer}>
            <Text style={styles.transactionNumber}>{item.trans_no}. </Text>
            <View style={styles.transactionInfo}>
              <View style={styles.ticketRow}>
                <Text style={styles.numberStyle}>{item.ticketcode}</Text>
                {isSynced && (
                  <Badge label="Synced" variant="success" />
                )}
                {!isSynced && item.status === 'printed' && (
                  <Badge label="Printed" variant="warning" />
                )}
              </View>
              <Text style={styles.subNumberStyle}>
                {convertDateTime(item.created_at)}
              </Text>
            </View>
          </View>
          <Text style={styles.totalAmount}>
            {formatNumberWithCommas(item.total)}
          </Text>
        </TouchableOpacity>
        <View style={styles.line} />
      </View>
    );
  },
);

TransactionItem.displayName = 'TransactionItem';

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionNumber: {
    color: palette.gray[400],
    fontSize: fontSize.xl,
    fontFamily: fontFamily.regular,
  },
  transactionInfo: {
    flexDirection: 'column',
    flex: 1,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  numberStyle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: palette.gray[900],
  },
  subNumberStyle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: palette.gray[500],
    marginTop: 2,
  },
  totalAmount: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: palette.success[500],
  },
  line: {
    alignSelf: 'center',
    height: 1,
    width: '95%',
    backgroundColor: palette.gray[200],
  },
});

export {TransactionItem};
