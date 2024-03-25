import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import LoginScreen from '../screens/AuthScreens/LoginScreen';

const Stack = createStackNavigator();

export default function AuthNavigator({navigation, route}) {
  return (
    <Stack.Navigator
      screenOptions={{
        animationEnabled: false,
      }}>
      <Stack.Screen
        name="Login"
        options={{
          headerShown: false,
        }}
        component={LoginScreen}
      />
    </Stack.Navigator>
  );
}
