import React from 'react';
import {TouchableOpacity, Text, StyleSheet} from 'react-native';
import Bet from '../models/Bet';

type BetProps = {
  item: Bet;
  onPress: () => void;
  backgroundColor: string;
  textColor: string;
};

export const BetItem = ({
  item,
  onPress,
  backgroundColor,
  textColor,
}: BetProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.item, {backgroundColor}]}>
      <Text style={[styles.title, {color: textColor}]}>{item.betNumber}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // item: {
  //   padding: 10,
  //   marginVertical: 8,
  //   marginHorizontal: 16,
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   borderWidth: 1,
  //   borderRadius: 5,
  // },

  item: {
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
  },

  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
