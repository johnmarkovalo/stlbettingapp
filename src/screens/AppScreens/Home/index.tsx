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
import {
  getActiveTypes,
  closeDatabaseConnection,
} from '../../../helper/sqlite.ts';
import moment from 'moment';
import {getCurrentDraw} from '../../../helper/functions.js';
import Type from '../../../models/Type.ts';

const widthScreen = Dimensions.get('window').width;
const Home = (props: any) => {
  const {navigation} = props;
  const [betTypes, setBetTypes] = useState([]);
  const [currentDraw, setCurrentDraw] = useState(null);

  useEffect(() => {
    getActiveTypes((types: Type[]) => {
      setBetTypes(types);
    });
  }, []);

  useEffect(() => {
    // Define a function to recalculate the current draw
    const recalculateCurrentDraw = () => {
      // Ensure betTypes[0] exists before accessing its draws
      if (betTypes.length > 0) {
        const firstTypeDraws = betTypes[0].draws;
        const currentDraw = getCurrentDraw(firstTypeDraws);
        setCurrentDraw(currentDraw);
      }
    };

    // Recalculate current draw initially when the component mounts
    recalculateCurrentDraw();

    // Set up interval for periodic recalculation (every 60 seconds)
    const intervalId = setInterval(recalculateCurrentDraw, 60000);

    // Clean up interval when the component unmounts
    return () => {
      clearInterval(intervalId);
    };
  }, [betTypes]);

  useEffect(() => {
    return () => {
      closeDatabaseConnection();
    };
  }, []);

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
              <Text style={styles.cardSubTitle}>
                {moment().format('MMM DD, YYYY')}
              </Text>
            </View>
            <View style={styles.verticalLine} />
            <View style={{width: widthScreen / 3}}>
              <Text style={styles.cardTitle}>TIME</Text>
              <Text style={styles.cardSubTitle}>
                {currentDraw === 1
                  ? '1ST DRAW'
                  : currentDraw === 2
                    ? '2ND DRAW'
                    : currentDraw === 3
                      ? '3RD DRAW'
                      : 'BET CLOSED'}
              </Text>
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
            {betTypes.map((button, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  navigation.navigate('Transac', {betType: button});
                }}
                // style={
                //   getCurrentDraw(button.draws) === null
                //     ? styles.buttonDisabled
                //     : styles.button
                // }
                style={styles.button}
                // disabled={getCurrentDraw(button.draws) === null}
              >
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
    color: Colors.primaryColor,
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

  buttonDisabled: {
    elevation: 8,
    backgroundColor: 'gray',
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
