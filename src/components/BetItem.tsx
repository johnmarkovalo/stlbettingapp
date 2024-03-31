import React from 'react';
import {TouchableOpacity, Text, StyleSheet, View} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Bet from '../models/Bet';
import Colors from '../Styles/Colors';
import colors from '../Styles/Colors';

type BetProps = {
  item: Bet;
  onPress: () => void;
};

export const BetItem = ({item, onPress}: BetProps) => {
  return (
    <View style={styles.container}>
      <View style={[styles.numberContainer, {width: 35}]}>
        <Text style={[styles.numberStyle, {color: colors.primaryColor}]}>
          {item.betNumber}
        </Text>
      </View>
      <View style={styles.verticalLine} />
      <View style={styles.numberContainer}>
        <Text style={styles.numberStyle}>
          {item.targetAmount} <Text style={{color: colors.green}}>T</Text>
        </Text>
      </View>
      <View style={styles.verticalLine} />
      <View style={styles.numberContainer}>
        <Text style={styles.numberStyle}>
          {item.rambolAmount} <Text style={{color: colors.red}}>R</Text>
        </Text>
      </View>
      <View style={styles.verticalLine} />
      <View style={styles.numberContainer}>
        <Text style={styles.numberStyle}>{item.subtotal}</Text>
      </View>
      <View style={styles.verticalLine} />
      <TouchableOpacity onPress={onPress}>
        <MaterialIcon name="delete" size={25} color={Colors.red} />
      </TouchableOpacity>
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

  verticalLine: {
    height: '80%', // Adjust height as needed
    width: 1,
    backgroundColor: 'gray',
  },

  numberContainer: {
    alignItems: 'flex-end',
    width: 55,
    margin: 0,
  },

  numberStyle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.mediumGrey,
  },
});
