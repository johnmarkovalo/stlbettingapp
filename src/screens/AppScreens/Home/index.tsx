import React, {useEffect, useState} from 'react';
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Styles from './Styles';
import Colors from '../../../Styles/Colors.ts';
import colors from '../../../Styles/Colors.ts';

const widthScreen = Dimensions.get('window').width;
const Home = (props: any) => {
  const {navigation} = props;
  const buttonData = [{name: 'STL'}, {name: 'S3'}];

  return (
    <SafeAreaView style={Styles.backgroundWrapper}>
      <View style={Styles.mainContainer}>
        <View style={Styles.headerContainer}>
          <Text style={Styles.logoText}>{'Home'}</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={{width: widthScreen / 3}}>
              <Text style={styles.cardTitle}>DATE</Text>
              <Text style={styles.cardSubTitle}>March 23, 2024</Text>
            </View>
            <View style={styles.verticalLine} />
            <View style={{width: widthScreen / 3}}>
              <Text style={styles.cardTitle}>TIME</Text>
              <Text style={styles.cardSubTitle}>3rd Draw</Text>
            </View>
            <View style={styles.verticalLine} />
            <View style={{width: widthScreen / 3}}>
              <Text style={styles.cardTitle}>BOOTH</Text>
              <Text style={styles.cardSubTitle}>ISABELA 01-001-2019</Text>
            </View>
          </View>
        </View>
        <View style={styles.container}>
          <ScrollView style={{marginTop: 20}}>
            {buttonData.map((button, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  navigation.navigate('Transac', {betType: button});
                }}
                style={[styles.button]}>
                <Text style={styles.textStyle}>{button.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={Styles.line} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  card: {
    height: 60,
    elevation: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },

  cardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  cardTitle: {
    fontSize: 16,
    color: Colors.darkGrey,
    fontWeight: 'bold',
    alignSelf: 'center',
    textTransform: 'uppercase',
  },

  cardSubTitle: {
    fontSize: 14,
    color: colors.primaryColor,
    fontWeight: 'bold',
    alignSelf: 'center',
    textTransform: 'uppercase',
  },

  verticalLine: {
    height: '80%', // Adjust height as needed
    width: 1,
    backgroundColor: 'gray',
  },

  container: {
    flex: 3,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },

  button: {
    elevation: 8,
    backgroundColor: Colors.primaryColor,
    borderRadius: 100,
    padding: 10,
    margin: 10,
    height: 60,
    width: widthScreen * 0.8,
    justifyContent: 'center',
  },

  textStyle: {
    fontSize: 30,
    color: '#fff',
    fontWeight: 'bold',
    alignSelf: 'center',
    textTransform: 'uppercase',
  },
});

export default Home;
