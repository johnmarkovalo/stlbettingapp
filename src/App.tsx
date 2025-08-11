/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useEffect} from 'react';
import {StatusBar, useColorScheme} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {Provider} from 'react-redux';
import {store, persistor} from './store/store';
import {PersistGate} from 'redux-persist/integration/react';
import {MD3LightTheme as DefaultTheme, PaperProvider} from 'react-native-paper';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import Navigation from './navigation';
import {DatabaseService, clearDatabase} from './database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const theme = {
  ...DefaultTheme,
};

function App(): React.JSX.Element {
  useEffect(() => {
    const checkAndInitializeDatabase = async () => {
      try {
        const isDatabaseInitialized = await AsyncStorage.getItem(
          'isDatabaseInitialized',
        );
        if (!isDatabaseInitialized) {
          try {
            const dbService = DatabaseService.getInstance();
            await dbService.initializeDatabase();
            await AsyncStorage.setItem('isDatabaseInitialized', 'true');
            await AsyncStorage.setItem(
              'API_URL',
              'http://zian-api-v1.philippinestl.com/api/v2/',
            );
          } catch (dbError) {
            console.error(
              'Database initialization failed, clearing and retrying:',
              dbError,
            );
            // Clear the database and try again
            try {
              await clearDatabase();
              const dbService = DatabaseService.getInstance();
              await dbService.initializeDatabase();
              await AsyncStorage.setItem('isDatabaseInitialized', 'true');
              await AsyncStorage.setItem(
                'API_URL',
                'http://zian-api-v1.philippinestl.com/api/v2/',
              );
            } catch (retryError) {
              console.error('Database retry failed:', retryError);
              // Set as initialized to prevent infinite retry loops
              await AsyncStorage.setItem('isDatabaseInitialized', 'true');
            }
          }
        }
      } catch (error) {
        console.error('Error initializing database:', error);
      }
    };

    checkAndInitializeDatabase();

    // Clean up function to close database connection when component unmounts
    // return () => {
    //   const dbService = DatabaseService.getInstance();
    //   dbService.closeDatabase();
    // };
  }, []);
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <StatusBar
            barStyle={isDarkMode ? 'light-content' : 'dark-content'}
            backgroundColor={backgroundStyle.backgroundColor}
          />
          <PaperProvider theme={theme}>
            <Navigation />
          </PaperProvider>
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;
