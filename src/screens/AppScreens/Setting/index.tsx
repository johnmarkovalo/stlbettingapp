import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';

import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Styles from './Styles';
import colors from '../../../Styles/Colors';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import {useDispatch, useSelector} from 'react-redux';
import {userActions, typesActions} from '../../../store/actions';
import {syncBetTypesAPI} from '../../../helper/api';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {updateTypes} from '../../../helper/sqlite';
const widthScreen = Dimensions.get('window').width;
const Setting = (props: any) => {
  const {navigation} = props;
  const user = useSelector(state => state.auth.user);
  const token = useSelector(state => state.auth.token);
  const dispatch = useDispatch();
  const [apiUrl, setApiUrl] = useState('');
  const [agent, setAgent] = useState({});

  useEffect(() => {
    (async () => {
      setApiUrl(await AsyncStorage.getItem('API_URL'));
      setAgent({...user});
    })();
  }, []);

  const logout = () => {
    Alert.alert('Confirmation', 'Are you sure you want to log out?', [
      {
        text: 'Yes',
        onPress: () => {
          // @ts-ignore
          dispatch(userActions.logout());
        },
      },
      {
        text: 'No',
      },
    ]);
  };

  const syncBetTypes = async () => {
    syncBetTypesAPI(apiUrl, token, (types: any) => {
      if (types) {
        updateTypes(types);
        Alert.alert('Success', 'Bet types synced');
        dispatch(typesActions.update(types));
      }
    });
  };

  return (
    <SafeAreaView style={Styles.backgroundWrapper}>
      <View style={Styles.mainContainer}>
        <View style={Styles.headerContainer}>
          <Text style={Styles.logoText}>{'Settings'}</Text>
        </View>
        <View style={styles.container}>
          <View style={styles.cardList}>
            <View style={styles.card}>
              <View style={styles.cardAvatar}>
                <MaterialIcon
                  name="account-circle"
                  size={50}
                  color={colors.darkGrey}
                />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{agent.agent_name}</Text>
                <Text style={styles.cardSubTitle}>{agent.agent_series}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                syncBetTypes();
              }}>
              <View style={styles.cardAvatar}>
                <MaterialIcon
                  name="cloud-sync"
                  size={50}
                  color={colors.darkGrey}
                />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Sync Settings</Text>
              </View>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.buttonStyle}
            onPress={() => {
              logout();
            }}>
            <Text style={styles.buttonTextStyle}>Logout</Text>
          </TouchableOpacity>
        </View>
        <View style={Styles.line} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  cardList: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },

  card: {
    height: 65,
    alignItems: 'center',
    justifyContent: 'center',
    alignContent: 'center',
    flexDirection: 'row',
  },

  cardAvatar: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardContent: {
    flex: 4,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },

  cardTitle: {
    fontSize: 16,
    color: colors.primaryColor,
    fontWeight: 'bold',
  },

  cardSubTitle: {
    fontSize: 14,
    color: colors.darkGrey,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  verticalLine: {
    height: '80%', // Adjust height as needed
    width: 1,
    backgroundColor: 'gray',
  },

  buttonStyle: {
    width: wp(97),
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 10,
    height: 50,
    backgroundColor: colors.primaryColor,
  },

  buttonTextStyle: {
    fontSize: 30,
    color: colors.White,
    fontWeight: 'bold',
    alignSelf: 'center',
    textTransform: 'uppercase',
  },
});

export default Setting;
