import React, {useState} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';

import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Styles from '../Styles';
import colors from '../../../../Styles/Colors';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import {databaseService} from '../../../../database';

const DRAW_TIMES = [
  {value: 1, label: '1st Draw (2PM)'},
  {value: 2, label: '2nd Draw (5PM)'},
  {value: 3, label: '3rd Draw (9PM)'},
];

const ResetStatus = (props: any) => {
  const {navigation} = props;

  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  });
  const [selectedDraw, setSelectedDraw] = useState<number>(1);
  const [transactionCount, setTransactionCount] = useState<number | null>(null);

  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const adjustDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
    setTransactionCount(null); // Reset count when date changes
  };

  const checkTransactionCount = async () => {
    try {
      const count = await databaseService.getTransactionCountByDateTime(
        selectedDate,
        selectedDraw,
      );
      setTransactionCount(count);
    } catch (error) {
      console.error('Error checking transaction count:', error);
      setTransactionCount(0);
    }
  };

  const handleResetStatus = async () => {
    // First check count
    const count = await databaseService.getTransactionCountByDateTime(
      selectedDate,
      selectedDraw,
    );

    if (count === 0) {
      Alert.alert(
        'No Transactions',
        `There are no transactions for ${formatDateForDisplay(selectedDate)}, ${
          DRAW_TIMES.find(d => d.value === selectedDraw)?.label
        }.`,
      );
      return;
    }

    const drawLabel = DRAW_TIMES.find(d => d.value === selectedDraw)?.label;

    Alert.alert(
      'Confirm Reset',
      `This will reset the status of ${count} transaction(s) to "printed" for:\n\nDate: ${formatDateForDisplay(
        selectedDate,
      )}\nDraw: ${drawLabel}\n\nThese transactions will be re-synced to the server on the next sync.\n\nAre you sure you want to proceed?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, Reset',
          style: 'destructive',
          onPress: performReset,
        },
      ],
    );
  };

  const performReset = async () => {
    setIsProcessing(true);
    try {
      const rowsAffected = await databaseService.updateTransactionStatusByDateTime(
        selectedDate,
        selectedDraw,
        'printed',
      );

      Alert.alert(
        'Success',
        `Successfully reset ${rowsAffected} transaction(s) to "printed" status.\n\nGo to History and tap the sync button to re-sync these transactions to the server.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error: any) {
      console.error('Error resetting status:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to reset transaction status. Please try again.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={Styles.backgroundWrapper}>
      <View style={Styles.mainContainer}>
        <View style={Styles.headerContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <MaterialIcon name="arrow-back" size={24} color={colors.Black} />
          </TouchableOpacity>
          <Text style={Styles.logoText}>{'Reset Status'}</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.container}>
          <View style={styles.contentContainer}>
            {/* Info Section */}
            <View style={styles.infoContainer}>
              <MaterialIcon
                name="info-outline"
                size={24}
                color={colors.primaryColor}
              />
              <Text style={styles.infoText}>
                This tool resets all transaction statuses to "printed" for a
                specific date and draw. This allows them to be re-synced to the
                server.
              </Text>
            </View>

            {/* Date Selector */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Select Date</Text>
              <View style={styles.dateSelector}>
                <TouchableOpacity
                  style={styles.dateArrowButton}
                  onPress={() => adjustDate(-1)}>
                  <MaterialIcon
                    name="chevron-left"
                    size={32}
                    color={colors.primaryColor}
                  />
                </TouchableOpacity>
                <View style={styles.dateDisplay}>
                  <Text style={styles.dateText}>
                    {formatDateForDisplay(selectedDate)}
                  </Text>
                  <Text style={styles.dateSubText}>{selectedDate}</Text>
                </View>
                <TouchableOpacity
                  style={styles.dateArrowButton}
                  onPress={() => adjustDate(1)}>
                  <MaterialIcon
                    name="chevron-right"
                    size={32}
                    color={colors.primaryColor}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Draw Time Selector */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Select Draw Time</Text>
              <View style={styles.drawSelector}>
                {DRAW_TIMES.map(draw => (
                  <TouchableOpacity
                    key={draw.value}
                    style={[
                      styles.drawButton,
                      selectedDraw === draw.value && styles.drawButtonSelected,
                    ]}
                    onPress={() => {
                      setSelectedDraw(draw.value);
                      setTransactionCount(null);
                    }}>
                    <Text
                      style={[
                        styles.drawButtonText,
                        selectedDraw === draw.value &&
                          styles.drawButtonTextSelected,
                      ]}>
                      {draw.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Check Count Button */}
            <TouchableOpacity
              style={styles.checkButton}
              onPress={checkTransactionCount}>
              <MaterialIcon name="search" size={20} color={colors.primaryColor} />
              <Text style={styles.checkButtonText}>Check Transaction Count</Text>
            </TouchableOpacity>

            {transactionCount !== null && (
              <View style={styles.countContainer}>
                <Text style={styles.countText}>
                  Found {transactionCount} transaction(s)
                </Text>
              </View>
            )}

            {/* Reset Button */}
            <TouchableOpacity
              style={[
                styles.resetButton,
                isProcessing && styles.resetButtonDisabled,
              ]}
              onPress={handleResetStatus}
              disabled={isProcessing}>
              {isProcessing ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator size="small" color={colors.White} />
                  <Text style={styles.resetButtonText}>Processing...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <MaterialIcon name="refresh" size={20} color={colors.White} />
                  <Text style={styles.resetButtonText}>
                    Set Status to Printed
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Warning Section */}
            <View style={styles.warningContainer}>
              <MaterialIcon
                name="warning"
                size={20}
                color={colors.mediumYellow}
              />
              <Text style={styles.warningText}>
                Use this feature only if you need to re-sync transactions that
                were already synced or if the sync process failed. After
                resetting, go to History and tap the sync button.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: wp(5),
    paddingTop: hp(2),
  },
  backButton: {
    padding: 5,
  },
  placeholder: {
    width: 34,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundLight,
    padding: wp(4),
    borderRadius: 8,
    marginBottom: hp(3),
  },
  infoText: {
    fontSize: 14,
    color: colors.textColor,
    marginLeft: wp(2),
    flex: 1,
    lineHeight: 20,
  },
  sectionContainer: {
    marginBottom: hp(3),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textColor,
    marginBottom: hp(1.5),
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.White,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.mediumGrey,
    padding: wp(2),
  },
  dateArrowButton: {
    padding: wp(2),
  },
  dateDisplay: {
    alignItems: 'center',
    flex: 1,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primaryColor,
  },
  dateSubText: {
    fontSize: 12,
    color: colors.darkGrey,
    marginTop: 2,
  },
  drawSelector: {
    gap: hp(1),
  },
  drawButton: {
    backgroundColor: colors.White,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.mediumGrey,
    padding: wp(4),
    alignItems: 'center',
    marginBottom: hp(1),
  },
  drawButtonSelected: {
    backgroundColor: colors.primaryColor,
    borderColor: colors.primaryColor,
  },
  drawButtonText: {
    fontSize: 16,
    color: colors.textColor,
    fontWeight: '500',
  },
  drawButtonTextSelected: {
    color: colors.White,
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.White,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primaryColor,
    padding: wp(4),
    marginBottom: hp(2),
  },
  checkButtonText: {
    fontSize: 16,
    color: colors.primaryColor,
    fontWeight: '500',
    marginLeft: wp(2),
  },
  countContainer: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    padding: wp(3),
    alignItems: 'center',
    marginBottom: hp(2),
  },
  countText: {
    fontSize: 16,
    color: colors.textColor,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: colors.primaryColor,
    paddingVertical: hp(2.5),
    paddingHorizontal: wp(5),
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(3),
  },
  resetButtonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    color: colors.White,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: wp(2),
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3CD',
    padding: wp(4),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFECB5',
  },
  warningText: {
    fontSize: 13,
    color: '#856404',
    marginLeft: wp(2),
    flex: 1,
    lineHeight: 18,
  },
});

export default ResetStatus;
