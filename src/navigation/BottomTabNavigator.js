import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

import {palette} from '../theme/colors';
import {fontFamily, fontSize} from '../theme/typography';
import {spacing} from '../theme/spacing';
import Icon from '../components/shared/Icon';

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
      screenOptions={{headerShown: false}}>
      <HomeStack.Screen name="Home" component={Home} />
    </HomeStack.Navigator>
  );
};

const HistoryStacks = () => {
  return (
    <HistoryStack.Navigator
      initialRouteName="History"
      screenOptions={{headerShown: false}}>
      <HistoryStack.Screen name="History" component={History} />
    </HistoryStack.Navigator>
  );
};

const ResultStacks = () => {
  return (
    <ResultStack.Navigator
      initialRouteName="Result"
      screenOptions={{headerShown: false}}>
      <ResultStack.Screen name="Result" component={Result} />
    </ResultStack.Navigator>
  );
};

const SettingStacks = () => {
  return (
    <SettingStack.Navigator
      initialRouteName="Dial"
      screenOptions={{headerShown: false}}>
      <SettingStack.Screen name="Setting" component={Setting} />
      <SettingStack.Screen name="PrinterSetup" component={PrinterSetup} />
      <SettingStack.Screen name="ResetStatus" component={ResetStatus} />
    </SettingStack.Navigator>
  );
};

const TAB_CONFIG = {
  HomeTab: {icon: 'GameController', label: 'Home'},
  HistoryTab: {icon: 'ListChecks', label: 'History'},
  ResultTab: {icon: 'Trophy', label: 'Result'},
  SettingTab: {icon: 'GearSix', label: 'Settings'},
};

export const BottomTabNavigator = props => {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarIcon: ({focused}) => {
          const config = TAB_CONFIG[route.name];
          const color = focused ? palette.primary[500] : palette.gray[400];

          return (
            <View style={styles.tabItem}>
              <Icon
                name={config.icon}
                size={22}
                color={color}
                weight={focused ? 'fill' : 'regular'}
              />
              <Text style={[styles.tabLabel, {color}]}>{config.label}</Text>
            </View>
          );
        },
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      })}>
      <Tab.Screen name="HomeTab" component={HomeStacks} />
      <Tab.Screen name="HistoryTab" component={HistoryStacks} />
      <Tab.Screen name="ResultTab" component={ResultStacks} />
      <Tab.Screen name="SettingTab" component={SettingStacks} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: hp(9),
    backgroundColor: palette.white,
    borderTopWidth: 1,
    borderTopColor: palette.gray[200],
    elevation: 0,
    shadowOpacity: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing[2],
  },
  tabLabel: {
    marginTop: spacing[1],
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
  },
});

export default BottomTabNavigator;
