/* eslint-disable react/react-in-jsx-scope */
import {
  CardStyleInterpolators,
  createStackNavigator, HeaderStyleInterpolators,
} from "@react-navigation/stack";
import BottomTabNavigator from './BottomTabNavigator';
import TransacScreen from "../screens/AppScreens/Home/TransacScreen";

const Stack = createStackNavigator();

const AppNavigator = ({navigation, route}) => {
  return (
    <Stack.Navigator>
      <Stack.Group>
        <Stack.Screen
          options={{ headerShown: false }}
          name="Home"
          component={BottomTabNavigator}
        />
      </Stack.Group>

      <Stack.Group
        screenOptions={{
          presentation: "card",
          cardStyleInterpolator: CardStyleInterpolators.forNoAnimation,
          gestureEnabled: false,
        }}
      >
        <Stack.Screen
          options={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            headerStyleInterpolator: HeaderStyleInterpolators.forSlideUp,
            gestureEnabled: false,
          }}
          name="Transac"
          component={TransacScreen}
        />
        {/*<Stack.Screen name="CallNotes" component={TransacScreen} />*/}
      </Stack.Group>
    </Stack.Navigator>
  );
};

export default AppNavigator;
