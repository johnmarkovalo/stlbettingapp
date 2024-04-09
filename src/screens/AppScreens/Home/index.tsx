import React, {useEffect, useState} from 'react';
import {
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {useSelector, useDispatch} from 'react-redux';
import Styles from './Styles';
import Colors from '../../../Styles/Colors.ts';
import {
  checkLastDrawTransactionStatus, deleteLastWeekTransactions,
  getLatestTransactionDateTime
} from "../../../helper/sqlite.ts";
import moment from 'moment';
import {getCurrentDraw} from '../../../helper/functions.js';
import Type from '../../../models/Type.ts';
import {typesActions} from '../../../store/actions/types.actions.ts';

const widthScreen = Dimensions.get('window').width;
const Home = (props: any) => {
  const user = useSelector(state => state.auth.user);
  const types = useSelector(state => state.types.types);
  const {navigation} = props;
  const [currentDraw, setCurrentDraw] = useState(null);
  const [validDateTime, setValidDateTime] = useState(true);

  const recalculateCurrentDraw = async () => {
    // Define a function to recalculate the current draw
    if (types.length > 0) {
      const firstTypeDraws = types[0].draws;
      const currentDraw = getCurrentDraw(firstTypeDraws);
      console.log('currentDraw', currentDraw);
      setCurrentDraw(currentDraw);
    }
    //Check if dateTime is valid
    const latestTranDate = await getLatestTransactionDateTime();
    if (latestTranDate) {
      const validDateTime = moment().isSameOrAfter(latestTranDate);
      setValidDateTime(validDateTime);
    }
    //Check if time is less than 1:05 AM and greater than 1:00 AM
    const currentHour = moment().hour();
    const currentMinute = moment().minute();
    if (currentHour < 1 && currentMinute < 5) {
      await deleteLastWeekTransactions();
    }
  };
  useEffect(() => {
    // Recalculate current draw initially when the component mounts
    recalculateCurrentDraw();

    // Set up interval for periodic recalculation (every 30 seconds)
    const intervalId = setInterval(recalculateCurrentDraw, 10000);

    // Clean up interval when the component unmounts
    return () => {
      clearInterval(intervalId);
    };
  }, [navigation]);

  const onTypePress = async (type: Type) => {
    const hasUnsyncedTransactions = await checkLastDrawTransactionStatus(
      getCurrentDraw(type.draws),
      type.bettypeid,
    );
    console.log('hasUnsyncedTransactions', hasUnsyncedTransactions);
    if (hasUnsyncedTransactions) {
      Alert.alert(
        'Warning',
        'Please sync your transactions before proceeding.',
      );
    } else {
      navigation.navigate('Transac', {betType: type});
    }
  };

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
              <Text style={styles.cardSubTitle}>{user?.agent_series}</Text>
            </View>
          </View>
        </View>
        {validDateTime && (
          <View style={styles.container}>
            <ScrollView style={{marginTop: 20}}>
              {types.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    onTypePress(button);
                  }}
                  style={
                    getCurrentDraw(button.draws) === null
                      ? styles.buttonDisabled
                      : styles.button
                  }
                  disabled={getCurrentDraw(button.draws) === null}>
                  <Text style={styles.textStyle}>{button.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        {!validDateTime && (
          <View style={styles.container}>
            <Text style={[styles.textStyle, {color: 'red'}]}>
              Invalid Date Time
            </Text>
          </View>
        )}
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
