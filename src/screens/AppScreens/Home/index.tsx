import React, {useEffect, useState, useCallback, useRef} from 'react';
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
  saveMaintenanceSchedules,
  getActiveMaintenanceSchedule,
  isInMaintenancePeriod,
} from '../../../database';
import {getMaintenanceScheduleAPI} from '../../../helper/api';
import moment from 'moment';
import {getCurrentDraw} from '../../../helper/functions.js';
import Type from '../../../models/Type.ts';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define types for Redux state
interface RootState {
  auth: {
    user: any;
    token: string;
  };
  types: {
    types: Type[];
  };
}

const widthScreen = Dimensions.get('window').width;
const MAX_UNSYNCED_TRANSACTIONS = 15; // Maximum unsynced transactions before blocking new ones

const Home = (props: any) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const types = useSelector((state: RootState) => state.types.types);
  const {navigation} = props;
  const [currentDraw, setCurrentDraw] = useState<number | null>(null);
  const [validDateTime, setValidDateTime] = useState(true);
  // State for UI
  const [hasUnsyncedTransactions, setHasUnsyncedTransactions] = useState(false);
  const [unsyncedSummary, setUnsyncedSummary] = useState<any>(null);
  // State for maintenance schedule
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceSchedule, setMaintenanceSchedule] = useState<{
    start_time: string;
    end_time: string;
    reason?: string;
  } | null>(null);

  // Refs for maintenance schedule caching and rate limiting
  const maintenanceScheduleCache = useRef<{
    data: any;
    timestamp: number;
  } | null>(null);
  const isFetchingMaintenance = useRef(false);
  const lastMaintenanceAPIFetch = useRef<number>(0);

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

  // Load maintenance schedule from local database only (fast, no API call)
  const loadMaintenanceScheduleFromDB = async () => {
    try {
      console.log('🔍 [Maintenance] Loading schedule from local database...');
      const activeSchedule = await getActiveMaintenanceSchedule();
      if (activeSchedule) {
        const now = moment();
        const startTime = moment(activeSchedule.start_time);
        const endTime = moment(activeSchedule.end_time);
        const isActive = now.isBetween(startTime, endTime, null, '[]');
        console.log('✅ [Maintenance] Active schedule found in DB:', {
          id: activeSchedule.id,
          start: activeSchedule.start_time,
          end: activeSchedule.end_time,
          reason: activeSchedule.reason,
          isCurrentlyActive: isActive,
          currentTime: now.format('YYYY-MM-DD HH:mm:ss'),
        });
        setMaintenanceSchedule({
          start_time: activeSchedule.start_time,
          end_time: activeSchedule.end_time,
          reason: activeSchedule.reason,
        });
      } else {
        console.log('ℹ️ [Maintenance] No active schedule in local database');
        setMaintenanceSchedule(null);
      }
    } catch (error) {
      console.error('❌ [Maintenance] Error loading schedule from DB:', error);
      setMaintenanceSchedule(null);
    }
  };

  // Fetch and save maintenance schedules from API
  // Optimized: Prevents duplicate fetches and adds rate limiting
  const fetchMaintenanceScheduleFromAPI = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (isFetchingMaintenance.current) {
      console.log('🔄 [Maintenance] API fetch already in progress, skipping...');
      return;
    }

    // Rate limit: Only fetch from API once per minute
    const now = Date.now();
    if (now - lastMaintenanceAPIFetch.current < 60000) {
      console.log('⏳ [Maintenance] API fetch rate limited, using cache...');
      return;
    }

    try {
      if (!token) {
        console.log('⚠️ [Maintenance] No token available, skipping API fetch');
        return;
      }

      isFetchingMaintenance.current = true;
      lastMaintenanceAPIFetch.current = now;

      console.log('🌐 [Maintenance] Fetching from API...');
      // Fetch all upcoming schedules (within 7 days) from API
      const schedules = await getMaintenanceScheduleAPI(token);
      console.log('📥 [Maintenance] API response:', {
        count: schedules?.length || 0,
        schedules: schedules,
      });

      if (schedules && schedules.length > 0) {
        console.log(`💾 [Maintenance] Saving ${schedules.length} schedule(s) to database...`);
        // Save all schedules to database
        const savedIds = await saveMaintenanceSchedules(
          schedules.map(schedule => ({
            id: schedule.id,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            reason: schedule.reason,
            is_active: schedule.is_active !== undefined ? schedule.is_active : 1,
          })),
        );
        console.log('✅ [Maintenance] Schedules saved:', savedIds);
      } else {
        console.log('ℹ️ [Maintenance] No schedules from API');
      }

      // Clear cache after updating
      maintenanceScheduleCache.current = null;

      // After saving, reload from DB to update UI
      await loadMaintenanceScheduleFromDB();
    } catch (error) {
      console.error('❌ [Maintenance] Error fetching maintenance schedule from API:', error);
      // On error, just load from local DB (don't block)
      await loadMaintenanceScheduleFromDB();
    } finally {
      isFetchingMaintenance.current = false;
    }
  }, [token]);

  // Check if currently in maintenance period (fast - local DB only)
  // Optimized: Uses cache to prevent repeated queries
  const checkMaintenanceStatus = useCallback(async () => {
    try {
      // Use cached result if available and fresh (within 5 seconds)
      const now = Date.now();
      if (
        maintenanceScheduleCache.current &&
        now - maintenanceScheduleCache.current.timestamp < 5000
      ) {
        const cached = maintenanceScheduleCache.current.data;
        setIsMaintenanceMode(cached.inMaintenance);
        if (cached.schedule) {
          setMaintenanceSchedule(cached.schedule);
        }
        return;
      }

      // Fast check - only query local database, no API call
      const inMaintenance = await isInMaintenancePeriod();
      setIsMaintenanceMode(inMaintenance);
      
      let schedule = null;
      // Update schedule display if needed
      if (inMaintenance && !maintenanceSchedule) {
        // If in maintenance but don't have schedule in state, load it
        schedule = await getActiveMaintenanceSchedule();
        setMaintenanceSchedule(schedule);
      } else if (!inMaintenance && maintenanceSchedule) {
        // If not in maintenance but have schedule, clear it
        setMaintenanceSchedule(null);
      } else if (inMaintenance) {
        schedule = maintenanceSchedule;
      }
      
      // Cache the result
      maintenanceScheduleCache.current = {
        data: {inMaintenance, schedule},
        timestamp: now,
      };
      
      if (inMaintenance && schedule) {
        const nowMoment = moment();
        const endTime = moment(schedule.end_time);
        const timeUntilEnd = moment.duration(endTime.diff(nowMoment));
        console.log(`📊 [Maintenance] Status: IN MAINTENANCE - Ends in ${timeUntilEnd.hours()}h ${timeUntilEnd.minutes()}m`);
      } else {
        console.log('📊 [Maintenance] Status: NOT IN MAINTENANCE');
      }
    } catch (error) {
      console.error('❌ [Maintenance] Error checking maintenance status:', error);
      setIsMaintenanceMode(false);
    }
  }, [maintenanceSchedule]);

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

    // Check maintenance status from local DB first (fast, immediate)
    await checkMaintenanceStatus();
    
    // Fetch from API in background (non-blocking, updates DB)
    if (token) {
      fetchMaintenanceScheduleFromAPI().catch(error => {
        console.error('❌ [Maintenance] Background fetch failed:', error);
        // Don't block - just log error
      });
    }

    // Check for unsynced transactions from previous draws
    // Only check if we have a valid current draw
    if (currentDraw !== null) {
      await checkUnsyncedTransactionsFromPreviousDraws();
    }
  };

  // Enhanced database cleanup function
  const performDatabaseCleanup = async () => {
    try {
      console.log('🧹 Database cleanup temporarily disabled');
      return;

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

    // Set up interval for periodic recalculation (every 10 seconds)
    const intervalId = setInterval(recalculateCurrentDraw, 10000);

    // Set up interval for checking maintenance status from local DB
    // Reduced frequency: Check every 60 seconds instead of 30 to reduce DB queries
    const maintenanceCheckInterval = setInterval(checkMaintenanceStatus, 60000);

    // Update cleanup info
    // updateNextCleanupInfo(); // This function is removed

    // Set up interval for updating cleanup info (every 5 minutes)
    // const cleanupIntervalId = setInterval(updateNextCleanupInfo, 5 * 60 * 1000); // This function is removed

    // Clean up intervals when the component unmounts
    return () => {
      clearInterval(intervalId);
      clearInterval(maintenanceCheckInterval);
      // clearInterval(cleanupIntervalId); // This function is removed
    };
  }, [navigation, types, token]); // Added types and token dependency to ensure we have types and token before checking

  // Refresh unsynced transaction check when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 [Maintenance] Home screen focused - refreshing maintenance data...');
      
      // Check for unsynced transactions when returning to Home screen
      if (types.length > 0 && currentDraw !== null) {
        checkUnsyncedTransactionsFromPreviousDraws();
      }

      // Check maintenance status from local DB first (fast, immediate)
      checkMaintenanceStatus();
      
      // Fetch from API every time screen comes into focus (fresh data)
      if (token) {
        fetchMaintenanceScheduleFromAPI().catch(error => {
          console.error('❌ [Maintenance] Focus fetch failed:', error);
        });
      }

      // Update cleanup info when screen comes into focus
      // updateNextCleanupInfo(); // This function is removed
    }, [types, currentDraw, token]),
  );

  const onTypePress = async (type: Type) => {
    // Check if in maintenance mode
    if (isMaintenanceMode) {
      const reason = maintenanceSchedule?.reason
        ? `\n\nReason: ${maintenanceSchedule.reason}`
        : '';
      const startTime = maintenanceSchedule
        ? moment(maintenanceSchedule.start_time).format('MMM DD, YYYY HH:mm')
        : '';
      const endTime = maintenanceSchedule
        ? moment(maintenanceSchedule.end_time).format('MMM DD, YYYY HH:mm')
        : '';
      Alert.alert(
        'Maintenance Mode',
        `Betting is currently unavailable due to scheduled maintenance.${reason}\n\nMaintenance Period:\n${startTime} - ${endTime}\n\nYou can still access History and Results.`,
        [{text: 'OK'}],
      );
      return;
    }

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

    // Check if too many unsynced transactions (15+ limit)
    if (unsyncedSummary && unsyncedSummary.totalCount >= MAX_UNSYNCED_TRANSACTIONS) {
      Alert.alert(
        'Sync Required',
        `You have ${unsyncedSummary.totalCount} unsynced transactions.\n\nMaximum allowed: ${MAX_UNSYNCED_TRANSACTIONS}\n\nPlease sync your transactions before creating new ones.`,
        [
          {
            text: 'Go to History',
            onPress: () => navigation.navigate('HistoryTab'),
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

        {/* Maintenance Mode Banner */}
        {isMaintenanceMode && maintenanceSchedule && (
          <View style={styles.maintenanceBanner}>
            <View style={styles.maintenanceHeader}>
              <MaterialIcon name="build" size={24} color="#ff9800" />
              <Text style={styles.maintenanceTitle}>Scheduled Maintenance</Text>
            </View>

            <View style={styles.maintenanceContent}>
              <Text style={styles.maintenanceText}>
                Betting is temporarily unavailable due to scheduled maintenance.
              </Text>
              {maintenanceSchedule.reason && (
                <Text style={styles.maintenanceReason}>
                  Reason: {maintenanceSchedule.reason}
                </Text>
              )}
              <Text style={styles.maintenanceTime}>
                Period:{' '}
                {moment(maintenanceSchedule.start_time).format(
                  'MMM DD, YYYY HH:mm',
                )}{' '}
                -{' '}
                {moment(maintenanceSchedule.end_time).format('MMM DD, YYYY HH:mm')}
              </Text>
              <Text style={styles.maintenanceNote}>
                You can still access History and Results.
              </Text>
            </View>
          </View>
        )}

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

              {/* Show limit warning when 15+ unsynced */}
              {unsyncedSummary.totalCount >= MAX_UNSYNCED_TRANSACTIONS && (
                <View style={styles.limitWarningContainer}>
                  <Text style={styles.limitWarning}>
                    ⛔ LIMIT REACHED: Maximum {MAX_UNSYNCED_TRANSACTIONS} unsynced allowed!
                  </Text>
                  <Text style={styles.limitWarningSubtext}>
                    You cannot place new bets until you sync.
                  </Text>
                </View>
              )}

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
                // 1. Maintenance mode is active
                // 2. Bet is closed (currentDraw === null) - no draws are active
                // 3. This specific button's draw is not active (getCurrentDraw(button.draws) === null)
                // 4. There are unsynced transactions from previous draws/dates
                // 5. Too many unsynced transactions (15+ limit)
                const hasUnsyncedFromPreviousDraws =
                  unsyncedSummary &&
                  unsyncedSummary.previousDraws &&
                  unsyncedSummary.previousDraws.length > 0;

                const hasTooManyUnsynced =
                  unsyncedSummary &&
                  unsyncedSummary.totalCount >= MAX_UNSYNCED_TRANSACTIONS;

                const isBettingClosed =
                  currentDraw === null || getCurrentDraw(button.draws) === null;
                const isButtonDisabled =
                  isMaintenanceMode ||
                  isBettingClosed ||
                  hasUnsyncedFromPreviousDraws ||
                  hasTooManyUnsynced;

                // Determine button style based on why it's disabled
                let buttonStyle = styles.button;
                let textStyle = styles.textStyle;

                if (isButtonDisabled) {
                  if (isMaintenanceMode) {
                    buttonStyle = styles.buttonDisabledMaintenance;
                    textStyle = styles.textStyleDisabled;
                  } else if (hasUnsyncedFromPreviousDraws || hasTooManyUnsynced) {
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

  buttonDisabledMaintenance: {
    elevation: 2,
    backgroundColor: '#fff3e0', // Light orange background
    borderRadius: 100,
    padding: 10,
    margin: 10,
    height: 60,
    width: widthScreen * 0.8,
    justifyContent: 'center',
    opacity: 0.8,
    borderWidth: 2,
    borderColor: '#ff9800',
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
  limitWarningContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 6,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.mediumRed,
  },
  limitWarning: {
    fontSize: 14,
    color: Colors.mediumRed,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  limitWarningSubtext: {
    fontSize: 12,
    color: Colors.darkGrey,
    textAlign: 'center',
    marginTop: 4,
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
  maintenanceBanner: {
    backgroundColor: '#fff3e0',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    marginHorizontal: 10,
    borderWidth: 2,
    borderColor: '#ff9800',
    elevation: 3,
    shadowColor: Colors.Black,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  maintenanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  maintenanceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff9800',
    marginLeft: 8,
  },
  maintenanceContent: {
    marginBottom: 5,
  },
  maintenanceText: {
    fontSize: 16,
    color: Colors.darkGrey,
    marginBottom: 5,
  },
  maintenanceReason: {
    fontSize: 14,
    color: Colors.darkGrey,
    fontStyle: 'italic',
    marginBottom: 5,
  },
  maintenanceTime: {
    fontSize: 14,
    color: Colors.darkGrey,
    fontWeight: '600',
    marginBottom: 5,
  },
  maintenanceNote: {
    fontSize: 14,
    color: Colors.darkGrey,
    marginTop: 5,
    fontStyle: 'italic',
  },
});

export default Home;
