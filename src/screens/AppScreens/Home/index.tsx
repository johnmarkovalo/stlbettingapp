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
import {useFocusEffect} from '@react-navigation/native';
import Styles from './Styles';
import Colors from '../../../Styles/Colors.ts';
import {
  checkLastDrawTransactionStatus,
  deleteLastWeekTransactions,
  getLatestTransactionDateTime,
  getUnsyncedTransactionsFromPreviousDraws,
  getUnsyncedTransactionsSummary,
  cleanupOldData,
  optimizeDatabase,
} from '../../../database';
import moment from 'moment';
import {getCurrentDraw} from '../../../helper/functions.js';
import Type from '../../../models/Type.ts';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define types for Redux state
interface RootState {
  auth: {
    user: any;
  };
  types: {
    types: Type[];
  };
}

const widthScreen = Dimensions.get('window').width;
const Home = (props: any) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const types = useSelector((state: RootState) => state.types.types);
  const {navigation} = props;
  const [currentDraw, setCurrentDraw] = useState<number | null>(null);
  const [validDateTime, setValidDateTime] = useState(true);
  // State for UI
  const [hasUnsyncedTransactions, setHasUnsyncedTransactions] = useState(false);
  const [unsyncedSummary, setUnsyncedSummary] = useState<any>(null);

  // Helper function to format draw names
  const getDrawName = (drawNumber: number): string => {
    switch (drawNumber) {
      case 1:
        return '1ST DRAW';
      case 2:
        return '2ND DRAW';
      case 3:
        return '3RD DRAW';
      default:
        return 'UNKNOWN DRAW';
    }
  };

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    return moment(dateString).format('MMM DD, YYYY');
  };

  // Comprehensive check for unsynced transactions from previous draws
  const checkUnsyncedTransactionsFromPreviousDraws = async () => {
    try {
      const currentDate = moment().format('YYYY-MM-DD');

      // Get unsynced transactions from previous draws
      const previousDrawsUnsynced =
        await getUnsyncedTransactionsFromPreviousDraws(
          currentDate,
          currentDraw || 1,
        );

      // Get overall summary of all unsynced transactions
      const allUnsyncedSummary = await getUnsyncedTransactionsSummary();

      if (previousDrawsUnsynced.length > 0 || allUnsyncedSummary.length > 0) {
        // Set state for UI indicators
        setHasUnsyncedTransactions(true);
        setUnsyncedSummary({
          previousDraws: previousDrawsUnsynced,
          allUnsynced: allUnsyncedSummary,
          totalCount: allUnsyncedSummary.reduce(
            (sum: number, item: any) => sum + item.unsynced_count,
            0,
          ),
          totalAmount: allUnsyncedSummary.reduce(
            (sum: number, item: any) => sum + (item.total_amount || 0),
            0,
          ),
        });

        // let alertMessage = '⚠️ You have unsynced transactions:\n\n';
        // let hasPreviousDraws = false;

        // Check for previous draws specifically
        // if (previousDrawsUnsynced.length > 0) {
        //   hasPreviousDraws = true;
        // alertMessage += '📅 FROM PREVIOUS DRAWS:\n';
        // previousDrawsUnsynced.forEach((item: any) => {
        //   const drawName = getDrawName(item.bettime);
        //   const date = formatDate(item.betdate);
        //   alertMessage += `• ${date} - ${drawName}: ${item.unsynced_count} transactions\n`;
        // });
        // alertMessage += '\n';
        // }

        // Add overall summary
        // if (allUnsyncedSummary.length > 0) {
        //   alertMessage += '📊 TOTAL UNSYNCED:\n';
        //   const totalUnsynced = allUnsyncedSummary.reduce(
        //     (sum: number, item: any) => sum + item.unsynced_count,
        //     0,
        //   );
        //   const totalAmount = allUnsyncedSummary.reduce(
        //     (sum: number, item: any) => sum + (item.total_amount || 0),
        //     0,
        //   );

        //   alertMessage += `• Total Transactions: ${totalUnsynced}\n`;
        //   alertMessage += `• Total Amount: ₱${totalAmount.toLocaleString()}\n\n`;

        //   // Show breakdown by date and draw
        //   alertMessage += '📋 BREAKDOWN:\n';
        //   allUnsyncedSummary.forEach((item: any) => {
        //     const drawName = getDrawName(item.bettime);
        //     const date = formatDate(item.betdate);
        //     const amount = (item.total_amount || 0).toLocaleString();
        //     alertMessage += `• ${date} - ${drawName}: ${item.unsynced_count} transactions (₱${amount})\n`;
        //   });
        // }

        // // Add action recommendation
        // if (hasPreviousDraws) {
        //   alertMessage +=
        //     '\n🚨 CRITICAL: You have unsynced transactions from previous draws!';
        //   alertMessage += '\nPlease sync these immediately to avoid data loss.';
        // } else {
        //   alertMessage += '\n💡 Please sync your transactions when convenient.';
        // }

        // // Show the alert
        // Alert.alert(
        //   'Unsynced Transactions Detected',
        //   alertMessage,
        //   [
        //     {
        //       text: 'Go to History',
        //       onPress: () => navigation.navigate('History'),
        //       style: 'default',
        //     },
        //     {
        //       text: 'Sync Now',
        //       onPress: () => {
        //         // Navigate to History and trigger sync
        //         navigation.navigate('History');
        //         // You could also add a flag to auto-trigger sync
        //       },
        //       style: 'default',
        //     },
        //     {
        //       text: 'Later',
        //       style: 'cancel',
        //     },
        //   ],
        //   {cancelable: false},
        // );

        return true; // Has unsynced transactions
      }

      // No unsynced transactions, reset state
      setHasUnsyncedTransactions(false);
      setUnsyncedSummary(null);

      return false; // No unsynced transactions
    } catch (error) {
      console.error('Error checking unsynced transactions:', error);
      return false;
    }
  };

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

    // Enhanced cleanup logic for old transactions
    await performDatabaseCleanup();

    // Check for unsynced transactions from previous draws
    // Only check if we have a valid current draw
    if (currentDraw !== null) {
      await checkUnsyncedTransactionsFromPreviousDraws();
    }
  };

  // Enhanced database cleanup function
  const performDatabaseCleanup = async () => {
    try {
      const currentHour = moment().hour();
      const currentMinute = moment().minute();

      // Cleanup conditions:
      // 1. Before first draw (3:30-3:55 AM) - daily maintenance window
      // 2. Every 7 days for deep cleanup
      const isBeforeFirstDraw =
        currentHour === 3 && currentMinute >= 30 && currentMinute < 55;

      // Additional check: if we're within 30 minutes of first draw start time
      const isApproachingFirstDraw = currentHour === 3 && currentMinute >= 0;

      if (isBeforeFirstDraw || isApproachingFirstDraw) {
        console.log('🧹 Pre-draw database cleanup window detected');

        // Check if we need to perform cleanup
        const lastCleanupDate = await AsyncStorage.getItem(
          'lastDatabaseCleanup',
        );
        const daysSinceLastCleanup = lastCleanupDate
          ? moment().diff(moment(lastCleanupDate), 'days')
          : 7; // Default to 7 days if never cleaned

        if (daysSinceLastCleanup >= 7) {
          console.log(
            '🧹 Performing weekly database cleanup before first draw',
          );

          // Show cleanup progress to user
          Alert.alert(
            'Database Maintenance',
            'Performing weekly database cleanup before first draw. This may take a few moments.',
            [{text: 'OK'}],
            {cancelable: false},
          );

          try {
            // Perform comprehensive cleanup
            const cleanupResult = await cleanupOldData(1); // 1 week old

            // Update last cleanup date
            await AsyncStorage.setItem(
              'lastDatabaseCleanup',
              moment().format('YYYY-MM-DD'),
            );

            // Show cleanup results
            Alert.alert(
              'Cleanup Completed',
              `Database cleanup completed successfully!\n\n` +
                `• ${cleanupResult.transactionsDeleted} old transactions deleted\n` +
                `• ${cleanupResult.betsDeleted} old bets deleted\n` +
                `• ${cleanupResult.resultsDeleted} old results deleted\n\n` +
                `Database has been optimized for better performance.\n\n` +
                `First draw will begin shortly.`,
              [{text: 'OK'}],
            );

            console.log('✅ Database cleanup completed:', cleanupResult);
          } catch (cleanupError) {
            console.error('❌ Database cleanup failed:', cleanupError);
            Alert.alert(
              'Cleanup Failed',
              'Database cleanup encountered an error. Please try again later.',
              [{text: 'OK'}],
            );
          }
        } else {
          console.log(
            `🧹 Cleanup not needed. Last cleanup: ${daysSinceLastCleanup} days ago`,
          );
        }
      }

      // Update next cleanup info for display
      // await updateNextCleanupInfo(); // This function is removed
    } catch (error) {
      console.error('Error during database cleanup:', error);
    }
  };

  // Function to calculate and display next cleanup time
  // const updateNextCleanupInfo = async () => { // This function is removed
  //   try {
  //     const lastCleanupDate = await AsyncStorage.getItem('lastDatabaseCleanup');
  //     let nextCleanupDate: moment.Moment;

  //     if (lastCleanupDate) {
  //       // Next cleanup is 7 days after last cleanup
  //       nextCleanupDate = moment(lastCleanupDate).add(7, 'days');
  //     } else {
  //       // If never cleaned, next cleanup is today at 3:30 AM
  //       nextCleanupDate = moment()
  //         .startOf('day')
  //         .add(3, 'hours')
  //         .add(30, 'minutes');

  //       // If today's time has passed, schedule for tomorrow
  //       if (nextCleanupDate.isBefore(moment())) {
  //         nextCleanupDate.add(1, 'day');
  //       }
  //     }

  //     const now = moment();
  //     const timeUntilCleanup = nextCleanupDate.diff(now, 'hours', true);

  //     if (timeUntilCleanup < 24) {
  //       // Less than 24 hours until cleanup
  //       const hours = Math.floor(timeUntilCleanup);
  //       const minutes = Math.round((timeUntilCleanup - hours) * 60);
  //       setNextCleanupInfo(`Next cleanup in ${hours}h ${minutes}m`);
  //     } else {
  //       // More than 24 hours until cleanup
  //       const days = Math.floor(timeUntilCleanup / 24);
  //       setNextCleanupInfo(`Next cleanup in ${days} days`);
  //     }
  //   } catch (error) {
  //     console.error('Error updating cleanup info:', error);
  //     setNextCleanupInfo('Cleanup schedule unavailable');
  //   }
  // };
  useEffect(() => {
    // Recalculate current draw initially when the component mounts
    recalculateCurrentDraw();

    // Set up interval for periodic recalculation (every 30 seconds)
    const intervalId = setInterval(recalculateCurrentDraw, 10000);

    // Update cleanup info
    // updateNextCleanupInfo(); // This function is removed

    // Set up interval for updating cleanup info (every 5 minutes)
    // const cleanupIntervalId = setInterval(updateNextCleanupInfo, 5 * 60 * 1000); // This function is removed

    // Clean up intervals when the component unmounts
    return () => {
      clearInterval(intervalId);
      // clearInterval(cleanupIntervalId); // This function is removed
    };
  }, [navigation, types]); // Added types dependency to ensure we have types before checking

  // Refresh unsynced transaction check when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Check for unsynced transactions when returning to Home screen
      if (types.length > 0 && currentDraw !== null) {
        checkUnsyncedTransactionsFromPreviousDraws();
      }

      // Update cleanup info when screen comes into focus
      // updateNextCleanupInfo(); // This function is removed
    }, [types, currentDraw]),
  );

  const onTypePress = async (type: Type) => {
    // Additional safety check: prevent navigation if betting is closed
    if (currentDraw === null) {
      Alert.alert(
        'Betting Closed',
        'Betting is currently closed. Please wait for the next draw.',
      );
      return;
    }

    // Check for unsynced transactions from previous draws
    const hasUnsyncedTransactions =
      await checkUnsyncedTransactionsFromPreviousDraws();
    console.log('hasUnsyncedTransactions', hasUnsyncedTransactions);

    if (hasUnsyncedTransactions) {
      // Check if there are unsynced transactions from previous draws/dates
      if (
        unsyncedSummary &&
        unsyncedSummary.previousDraws &&
        unsyncedSummary.previousDraws.length > 0
      ) {
        Alert.alert(
          'Cannot Place New Bets',
          'You have unsynced transactions from previous draws/dates. Please sync these transactions before placing new bets.',
          [
            {
              text: 'Go to History',
              onPress: () => navigation.navigate('History'),
              style: 'default',
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ],
          {cancelable: false},
        );
        return;
      }

      // If there are unsynced transactions but not from previous draws, show warning but allow navigation
      Alert.alert(
        'Unsynced Transactions Warning',
        'You have unsynced transactions. Please sync them when convenient.',
        [
          {
            text: 'Continue',
            onPress: () => navigation.navigate('Transac', {betType: type}),
            style: 'default',
          },
          {
            text: 'Go to History',
            onPress: () => navigation.navigate('History'),
            style: 'default',
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
      );
      return;
    } else {
      navigation.navigate('Transac', {betType: type});
    }
  };

  return (
    <SafeAreaView style={Styles.backgroundWrapper}>
      <View style={Styles.mainContainer}>
        <View style={Styles.headerContainer}>
          <Text style={Styles.logoText}>{'Home'}</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={checkUnsyncedTransactionsFromPreviousDraws}>
              <MaterialIcon
                name="refresh"
                size={24}
                color={Colors.primaryColor}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cleanupButton}
              onPress={performDatabaseCleanup}
              accessibilityLabel="Manual database cleanup"
              accessibilityHint="Runs database cleanup manually. Automatic cleanup runs before first draw (3:30-3:55 AM)">
              <MaterialIcon
                name="cleaning-services"
                size={24}
                color={Colors.mediumGreen}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Cleanup Schedule Info */}
        {/* {nextCleanupInfo && ( // This block is removed
          <View style={styles.cleanupInfoContainer}>
            <MaterialIcon name="schedule" size={16} color={Colors.mediumGrey} />
            <Text style={styles.cleanupInfoText}>{nextCleanupInfo}</Text>
          </View>
        )} */}

        {/* Unsynced Transactions Warning Banner */}
        {hasUnsyncedTransactions && unsyncedSummary && (
          <View style={styles.unsyncedWarningBanner}>
            <View style={styles.warningHeader}>
              <MaterialIcon name="warning" size={24} color={Colors.mediumRed} />
              <Text style={styles.warningTitle}>Unsynced Transactions</Text>
            </View>

            <View style={styles.warningContent}>
              <Text style={styles.warningText}>
                You have {unsyncedSummary.totalCount} unsynced transactions
                worth ₱{unsyncedSummary.totalAmount.toLocaleString()}
              </Text>

              {unsyncedSummary.previousDraws &&
                unsyncedSummary.previousDraws.length > 0 && (
                  <View>
                    <Text style={styles.criticalWarning}>
                      🚨 CRITICAL: {unsyncedSummary.previousDraws.length}{' '}
                      previous draw(s) have unsynced transactions!
                    </Text>
                  </View>
                )}
            </View>

            <TouchableOpacity
              style={styles.syncNowButton}
              onPress={() => navigation.navigate('HistoryTab')}>
              <Text style={styles.syncNowButtonText}>Sync Now</Text>
            </TouchableOpacity>
          </View>
        )}

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
            {currentDraw === null && (
              <View style={styles.closedMessage}>
                <Text style={styles.closedMessageText}>
                  Betting is currently closed. Please wait for the next draw.
                </Text>
              </View>
            )}
            <ScrollView style={{marginTop: 20}}>
              {types.map((button, index) => {
                // Button is disabled when:
                // 1. Bet is closed (currentDraw === null) - no draws are active
                // 2. This specific button's draw is not active (getCurrentDraw(button.draws) === null)
                // 3. There are unsynced transactions from previous draws/dates
                const hasUnsyncedFromPreviousDraws =
                  unsyncedSummary &&
                  unsyncedSummary.previousDraws &&
                  unsyncedSummary.previousDraws.length > 0;

                const isBettingClosed =
                  currentDraw === null || getCurrentDraw(button.draws) === null;
                const isButtonDisabled =
                  isBettingClosed || hasUnsyncedFromPreviousDraws;

                // Determine button style based on why it's disabled
                let buttonStyle = styles.button;
                let textStyle = styles.textStyle;

                if (isButtonDisabled) {
                  if (hasUnsyncedFromPreviousDraws) {
                    buttonStyle = styles.buttonDisabledUnsynced;
                    textStyle = styles.textStyleDisabled;
                  } else {
                    buttonStyle = styles.buttonDisabled;
                    textStyle = styles.textStyleDisabled;
                  }
                }

                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      onTypePress(button);
                    }}
                    style={buttonStyle}
                    disabled={isButtonDisabled}>
                    <Text style={textStyle}>{button.name}</Text>
                  </TouchableOpacity>
                );
              })}
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
    elevation: 2,
    backgroundColor: '#cccccc',
    borderRadius: 100,
    padding: 10,
    margin: 10,
    height: 60,
    width: widthScreen * 0.8,
    justifyContent: 'center',
    opacity: 0.6,
  },

  buttonDisabledUnsynced: {
    elevation: 2,
    backgroundColor: '#ffebee', // Light red background
    borderRadius: 100,
    padding: 10,
    margin: 10,
    height: 60,
    width: widthScreen * 0.8,
    justifyContent: 'center',
    opacity: 0.8,
    borderWidth: 2,
    borderColor: Colors.mediumRed,
  },

  textStyle: {
    fontSize: 30,
    color: '#fff',
    fontWeight: 'bold',
    alignSelf: 'center',
    textTransform: 'uppercase',
  },

  closedMessage: {
    backgroundColor: Colors.mediumRed,
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    alignSelf: 'center',
    width: widthScreen * 0.8,
  },

  closedMessageText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },

  unsyncedWarningBanner: {
    backgroundColor: Colors.backgroundLight,
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    marginHorizontal: 10,
    borderWidth: 2,
    borderColor: Colors.mediumRed,
    elevation: 3,
    shadowColor: Colors.Black,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.mediumRed,
    marginLeft: 8,
  },
  warningContent: {
    marginBottom: 10,
  },
  warningText: {
    fontSize: 16,
    color: Colors.darkGrey,
    marginBottom: 5,
  },
  criticalWarning: {
    fontSize: 14,
    color: Colors.mediumRed,
    fontWeight: 'bold',
    marginTop: 5,
  },
  syncNowButton: {
    backgroundColor: Colors.primaryColor,
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'center',
  },
  syncNowButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  refreshButton: {
    marginLeft: 10,
  },
  cleanupButton: {
    marginLeft: 10,
  },
  headerButtons: {
    flexDirection: 'row',
  },
  textStyleDisabled: {
    fontSize: 30,
    color: '#888', // Grayed out text
    fontWeight: 'bold',
    alignSelf: 'center',
    textTransform: 'uppercase',
  },
});

export default Home;
