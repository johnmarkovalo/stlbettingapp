/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import {StatusBar, useColorScheme} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
// import {Provider} from 'react-redux';
// import {store, persistor} from './store/store';
// import {PersistGate} from 'redux-persist/integration/react';
import {MD3LightTheme as DefaultTheme, PaperProvider} from 'react-native-paper';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import Navigation from './navigation';

const theme = {
  ...DefaultTheme,
};
function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    // <Provider store={store}>
    //   <PersistGate loading={null} persistor={persistor}>
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <PaperProvider theme={theme}>
        <Navigation />
      </PaperProvider>
    </SafeAreaProvider>
    //   </PersistGate>
    // </Provider>
  );
}

export default App;
