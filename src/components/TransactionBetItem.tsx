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

type BetProps = {
  item: Bet;
  index: number;
  onPress: () => void;
};

export const TransactionBetItem = ({item, index, onPress}: BetProps) => {
  return (
    <View style={styles.container}>
      <View style={[styles.numberContainer, {width: 20, alignItems: 'center'}]}>
        <Text
          style={[
            styles.numberStyle,
            {color: Colors.darkGrey, fontWeight: 'normal'},
          ]}>
          {index + 1 + '.'}
        </Text>
      </View>
      <View style={[styles.numberContainer, {width: 35}]}>
        <Text style={[styles.numberStyle, {color: Colors.primaryColor}]}>
          {item.betNumber}
        </Text>
      </View>
      <View style={styles.numberContainer}>
        <Text style={styles.numberStyle}>
          {item.targetAmount} <Text style={{color: Colors.green}}>T</Text>
        </Text>
      </View>
      <View style={styles.numberContainer}>
        <Text style={styles.numberStyle}>
          {item.rambolAmount} <Text style={{color: Colors.red}}>R</Text>
        </Text>
      </View>
      <View style={styles.numberContainer}>
        <Text style={styles.numberStyle}>{item.subtotal}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    marginVertical: 2,
    marginHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
});
