import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Dimensions,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Bet from '../models/Bet';
import Colors from '../Styles/Colors';

const widthScreen = Dimensions.get('window').width;

interface TransactionBetItemProps {
  item: Bet;
  index: number;
  onPress: () => void;
}

const TransactionBetItem: React.FC<TransactionBetItemProps> = React.memo(
  ({item, index, onPress}) => {
    const renderIndex = () => (
      <View style={[styles.numberContainer, {width: 20, alignItems: 'center'}]}>
        <Text style={styles.indexStyle}>{index + 1 + '.'}</Text>
      </View>
    );

    const renderBetNumber = () => (
      <View style={[styles.numberContainer, {width: 35}]}>
        <Text style={[styles.numberStyle, {color: Colors.primaryColor}]}>
          {item.betNumber}
        </Text>
      </View>
    );

    const renderTargetAmount = () => (
      <View style={styles.numberContainer}>
        <Text style={styles.numberStyle}>
          {item.targetAmount} <Text style={styles.targetLabel}>T</Text>
        </Text>
      </View>
    );

    const renderRambolAmount = () => (
      <View style={styles.numberContainer}>
        <Text style={styles.numberStyle}>
          {item.rambolAmount} <Text style={styles.rambolLabel}>R</Text>
        </Text>
      </View>
    );

    const renderSubtotal = () => (
      <View style={styles.numberContainer}>
        <Text style={styles.numberStyle}>{item.subtotal}</Text>
      </View>
    );

    return (
      <View style={styles.container}>
        {renderIndex()}
        {renderBetNumber()}
        {renderTargetAmount()}
        {renderRambolAmount()}
        {renderSubtotal()}
      </View>
    );
  },
);

TransactionBetItem.displayName = 'TransactionBetItem';

const styles = StyleSheet.create({
  container: {
    padding: 10,
    marginVertical: 2,
    marginHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  numberContainer: {
    alignItems: 'flex-end',
    width: widthScreen * 0.2,
    margin: 0,
  },
  numberStyle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.darkGrey,
  },
  indexStyle: {
    fontSize: 20,
    color: Colors.darkGrey,
    fontWeight: 'normal',
  },
  targetLabel: {
    color: Colors.green,
  },
  rambolLabel: {
    color: Colors.red,
  },
});

export {TransactionBetItem};
