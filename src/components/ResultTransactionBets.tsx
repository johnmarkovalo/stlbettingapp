import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {View, StyleSheet, Text, FlatList} from 'react-native';
import Colors from '../Styles/Colors';
import Bet from '../models/Bet';
import type ResultModel from '../models/Result';
import {TransactionBetItem} from './TransactionBetItem';
import {formatNumberWithCommas} from '../helper';
import {getWinningTransactionBets} from '../database';
import BaseModal from './shared/BaseModal';

// Define types for component props
interface ResultTransactionBetsProps {
  hide: () => void;
  result: ResultModel | null;
  transaction: {
    id: number;
    ticketcode: string;
  };
}

const ResultTransactionBets: React.FC<ResultTransactionBetsProps> = React.memo(
  ({hide, result, transaction}) => {
    const [totalAmount, setTotalAmount] = useState(0);
    const [bets, setBets] = useState<Bet[]>([]);

    const renderItem = useCallback(
      ({item, index}: {item: Bet; index: number}) => (
        <TransactionBetItem
          key={item.id || index}
          item={item}
          index={index}
          onPress={() => {}}
        />
      ),
      [],
    );

    const fetchWinningBets = useCallback(async () => {
      if (!result || !result.result) {
        setBets([]);
        setTotalAmount(0);
        return;
      }

      try {
        // Use optimized method that returns Promise instead of callback
        const fetchedBets = await getWinningTransactionBets(
          transaction.id,
          result,
        );
        console.log('Winning bets fetched:', fetchedBets);
        setBets(fetchedBets);
      } catch (error) {
        console.error('Error fetching winning bets:', error);
        setBets([]);
      }
    }, [transaction.id, result]);

    useEffect(() => {
      fetchWinningBets();
    }, [fetchWinningBets]);

    useEffect(() => {
      const total = bets.reduce((sum, item) => sum + item.subtotal, 0);
      setTotalAmount(total);
    }, [bets]);

    const totalDisplay = useMemo(
      () => (
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalAmount}>
            {formatNumberWithCommas(totalAmount)}
          </Text>
        </View>
      ),
      [totalAmount],
    );

    const keyExtractor = useCallback(
      (item: Bet, index: number) => item.id?.toString() || index.toString(),
      [],
    );

    return (
      <BaseModal title={transaction.ticketcode} onClose={hide} height={0.6}>
        {totalDisplay}
        <FlatList
          data={bets}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      </BaseModal>
    );
  },
);

ResultTransactionBets.displayName = 'ResultTransactionBets';

const styles = StyleSheet.create({
  totalContainer: {
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 20,
    color: Colors.Black,
    marginRight: 5,
  },
  totalAmount: {
    fontWeight: 'bold',
    fontSize: 30,
    color: Colors.mediumGreen,
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: 10,
  },
});

export default ResultTransactionBets;
