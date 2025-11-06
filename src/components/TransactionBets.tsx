import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../Styles/Colors';
import Bet from '../models/Bet';
import Transaction from '../models/Transaction';
import {TransactionBetItem} from './TransactionBetItem';
import {formatNumberWithCommas} from '../helper';
import {getBetsByTransaction, getTransactionByTicketCode} from '../database';
import {printTransaction} from '../helper/printer';
import {useSelector} from 'react-redux';
import BaseModal from './shared/BaseModal';

// Define types for component props
interface TransactionBetsProps {
  transaction: {
    id: number;
    ticketcode: string;
  };
  hide: () => void;
}

// Define types for Redux state
interface RootState {
  auth: {
    user: any;
    token: string;
  };
  types: {
    types: any[];
  };
}

const TransactionBets: React.FC<TransactionBetsProps> = React.memo(
  ({transaction, hide}) => {
    const user = useSelector((state: RootState) => state.auth.user);
    const betTypes = useSelector((state: RootState) => state.types.types);

    const [totalAmount, setTotalAmount] = useState(0);
    const [bets, setBets] = useState<Bet[]>([]);
    const [fullTransaction, setFullTransaction] = useState<Transaction | null>(
      null,
    );
    const [isPrinting, setIsPrinting] = useState(false);

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

    const fetchBets = useCallback(async () => {
      try {
        const fetchedBets = await getBetsByTransaction(transaction.id);
        if (fetchedBets) {
          setBets(fetchedBets as Bet[]);
        }
      } catch (error) {
        console.error('Error fetching bets:', error);
        setBets([]);
      }
    }, [transaction.id]);

    const fetchFullTransaction = useCallback(async () => {
      try {
        // Wrap callback-based function in Promise
        const fetchedTransaction = await new Promise<Transaction | null>(
          resolve => {
            getTransactionByTicketCode(transaction.ticketcode, transaction => {
              resolve(transaction);
            });
          },
        );
        if (fetchedTransaction) {
          setFullTransaction(fetchedTransaction as Transaction);
        }
      } catch (error) {
        console.error('Error fetching transaction:', error);
      }
    }, [transaction.ticketcode]);

    useEffect(() => {
      fetchBets();
      fetchFullTransaction();
    }, [fetchBets, fetchFullTransaction]);

    const handlePrint = useCallback(async () => {
      if (!fullTransaction) {
        Alert.alert('Error', 'Transaction data not loaded yet');
        return;
      }

      if (!bets || bets.length === 0) {
        Alert.alert('Error', 'No bets found for this transaction');
        return;
      }

      // Find bet type from Redux
      const betType = betTypes.find(
        (type: any) => type.bettypeid === fullTransaction.bettypeid,
      );

      if (!betType) {
        Alert.alert('Error', 'Bet type not found');
        return;
      }

      setIsPrinting(true);
      try {
        await printTransaction(fullTransaction, betType, bets, user);
        Alert.alert('Success', 'Transaction printed successfully');
      } catch (error: any) {
        console.error('Print error:', error);
        Alert.alert(
          'Print Error',
          error.message || 'Failed to print transaction',
        );
      } finally {
        setIsPrinting(false);
      }
    }, [fullTransaction, bets, betTypes, user]);

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
        <TouchableOpacity
          style={[styles.printButton, isPrinting && styles.printButtonDisabled]}
          onPress={handlePrint}
          disabled={isPrinting || !fullTransaction}>
          {isPrinting ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color={Colors.White} />
              <Text style={styles.printButtonText}>Printing...</Text>
            </View>
          ) : (
            <View style={styles.buttonContent}>
              <MaterialIcon name="print" size={20} color={Colors.White} />
              <Text style={styles.printButtonText}>Print Transaction</Text>
            </View>
          )}
        </TouchableOpacity>
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

TransactionBets.displayName = 'TransactionBets';

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
  printButton: {
    backgroundColor: Colors.primaryColor,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    marginHorizontal: 10,
  },
  printButtonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  printButtonText: {
    color: Colors.White,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default TransactionBets;
