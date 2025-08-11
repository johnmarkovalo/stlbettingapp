import React, {useEffect, useRef, useState} from 'react';
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
import {
  userActions,
  typesActions,
  soldoutsActions,
} from '../../../store/actions';
import {syncBetTypesAPI, getSoldOutsAPI} from '../../../helper/api';
import {insertTypes} from '../../../database';
import {
  formatBetTypes,
  checkInternetConnection,
} from '../../../helper/functions';
import {APP_VERSION, appConfig} from '../../../config/appConfig';

// Define types for Redux state
interface RootState {
  auth: {
    user: any;
    token: string;
  };
}

const widthScreen = Dimensions.get('window').width;
const Setting = (props: any) => {
  const internetStatusCheck = useRef(checkInternetConnection());
  const {navigation} = props;
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const dispatch = useDispatch();
  const [agent, setAgent] = useState<any>({});

  useEffect(() => {
    setAgent({...user});
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
    if (!internetStatusCheck.current.isConnected()) {
      Alert.alert('Error', 'No internet connection');
      return;
    }
    if (internetStatusCheck.current.isSlow()) {
      Alert.alert('Error', 'Slow internet connection');
      return;
    }
    const types = await syncBetTypesAPI(token);
    if (types) {
      insertTypes(types);
      Alert.alert('Success', 'Settings are synced');
      dispatch(typesActions.update(formatBetTypes(types)));
    }

    const soldouts = await getSoldOutsAPI(token);
    if (soldouts) {
      dispatch(soldoutsActions.update(soldouts));
    }
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
          {/* <Text style={styles.cardSubTitle}>{APP_VERSION}</Text> */}
          <TouchableOpacity
            style={styles.buttonStyle}
            onLongPress={() => {
              logout();
            }}>
            <Text style={styles.cardSubTitle}>{APP_VERSION}</Text>
            {/* <Text style={styles.buttonTextStyle}>Logout</Text> */}
          </TouchableOpacity>
        </View>
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
    // backgroundColor: colors.primaryColor,
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
