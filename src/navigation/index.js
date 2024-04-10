/**
 * If you are not familiar with React Navigation, check out the "Fundamentals" guide:
 * https://reactnavigation.org/docs/getting-started
 *
 */
import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import { typesActions } from '../store/actions/types.actions';
import { getActiveTypes } from '../helper/sqlite';

// Define the Navigation component
export default function Navigation() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

// Create a root stack navigator
const Stack = createStackNavigator();

// Define the RootNavigator component
function RootNavigator() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const authentication = useSelector(state => state.auth.loggedIn);

  // Fetch data when the component mounts
  useEffect(() => {
    const fetchData = async () => {
      const types = await getActiveTypes();
      if (types) {
        dispatch(typesActions.update(types));
      }
    };
    fetchData();
  }, [dispatch]);

  // Handle back button press
  useEffect(() => {
    const handleBackPress = () => {
      if (navigation.isFocused()) {
        // Prevent app from exiting if it's the last screen
        return true;
      }
      return false;
    };

    // Add event listener for hardware back button press
    BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    // Remove event listener when component is unmounted
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
    };
  }, [navigation]);

  // Set up the Stack Navigator
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} >
      {authentication ? (
        <Stack.Screen name="App" component={AppNavigator} options={{ gestureEnabled: false }} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} options={{ gestureEnabled: false }} />
      )}
    </Stack.Navigator>
  );
}
