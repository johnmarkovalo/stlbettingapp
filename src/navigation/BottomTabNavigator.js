import React from 'react';
import {View, Image, Text} from 'react-native';

import Images from '../Styles/Images';
import Colors from '../Styles/Colors';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {heightPercentageToDP as hp} from 'react-native-responsive-screen';

import Home from '../screens/AppScreens/Home';
import History from '../screens/AppScreens/History';
import Result from '../screens/AppScreens/Result';
import Setting from '../screens/AppScreens/Setting';
import PrinterSetup from '../screens/AppScreens/Setting/PrinterSetup';
import ResetStatus from '../screens/AppScreens/Setting/ResetStatus';

const navigationRef = React.createRef();

export function navigate(name, params) {
  navigationRef.current?.navigate(name, params);
}

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const HistoryStack = createStackNavigator();
const ResultStack = createStackNavigator();
const SettingStack = createStackNavigator();

export const HomeStacks = () => {
  return (
    <HomeStack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
      }}>
      <HomeStack.Screen name="Home" component={Home} />
    </HomeStack.Navigator>
  );
};
const HistoryStacks = () => {
  return (
    <HistoryStack.Navigator
      initialRouteName="History"
      screenOptions={{
        headerShown: false,
      }}>
      <HistoryStack.Screen name="History" component={History} />
    </HistoryStack.Navigator>
  );
};

const ResultStacks = () => {
  return (
    <ResultStack.Navigator
      initialRouteName="Result"
      screenOptions={{
        headerShown: false,
      }}>
      <ResultStack.Screen name="Result" component={Result} />
    </ResultStack.Navigator>
  );
};
const SettingStacks = () => {
  return (
    <SettingStack.Navigator
      initialRouteName="Dial"
      screenOptions={{
        headerShown: false,
      }}>
      <SettingStack.Screen name="Setting" component={Setting} />
      <SettingStack.Screen name="PrinterSetup" component={PrinterSetup} />
      <SettingStack.Screen name="ResetStatus" component={ResetStatus} />
    </SettingStack.Navigator>
  );
};

export const BottomTabNavigator = props => {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarIcon: ({focused}) => {
          let icon;
          let name;
          if (route.name === 'HomeTab') {
            icon = 'dialpad';
            name = 'Home';
          } else if (route.name === 'HistoryTab') {
            icon = 'list';
            name = 'History';
          } else if (route.name === 'ResultTab') {
            icon = 'pin';
            name = 'Result';
          } else if (route.name === 'SettingTab') {
            icon = 'settings';
            name = 'Settings';
          }

          return (
            <>
              <View
                style={{
                  alignSelf: 'center',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <MaterialIcons
                  name={icon}
                  style={{
                    marginTop: hp(1),
                    fontSize: 20,
                    color: focused ? Colors.primaryColor : Colors.mediumGrey,
                  }}
                />
                <Text
                  style={{
                    marginTop: hp(1),
                    fontSize: 12,
                    fontFamily: 'Nunito-Medium',
                    color: focused ? Colors.primaryColor : Colors.mediumGrey,
                  }}>
                  {name}
                </Text>
              </View>
            </>
          );
        },
        tabBarStyle: {
          height: hp(9),
          backgroundColor: Colors.White,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarShowLabel: false,
      })}>
      <Tab.Screen name="HomeTab" component={HomeStacks} />
      <Tab.Screen name="HistoryTab" component={HistoryStacks} />
      <Tab.Screen name="ResultTab" component={ResultStacks} />
      <Tab.Screen name="SettingTab" component={SettingStacks} />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
