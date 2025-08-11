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

interface BetItemProps {
  item: Bet;
  onPress: () => void;
}

const BetItem: React.FC<BetItemProps> = React.memo(({item, onPress}) => {
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

  const renderDeleteButton = () => (
    <TouchableOpacity onPress={onPress} style={styles.deleteButton}>
      <MaterialIcon name="delete" size={25} color={Colors.red} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {renderBetNumber()}
      <View style={styles.verticalLine} />
      {renderTargetAmount()}
      <View style={styles.verticalLine} />
      {renderRambolAmount()}
      <View style={styles.verticalLine} />
      {renderSubtotal()}
      <View style={styles.verticalLine} />
      {renderDeleteButton()}
    </View>
  );
});

BetItem.displayName = 'BetItem';

const styles = StyleSheet.create({
  container: {
    padding: 10,
    marginVertical: 2,
    marginHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verticalLine: {
    height: '80%',
    width: 1,
    backgroundColor: 'gray',
  },
  numberContainer: {
    alignItems: 'flex-end',
    width: widthScreen * 0.15,
    margin: 0,
  },
  numberStyle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.darkGrey,
  },
  targetLabel: {
    color: Colors.green,
  },
  rambolLabel: {
    color: Colors.red,
  },
  deleteButton: {
    padding: 5,
  },
});

export {BetItem};
