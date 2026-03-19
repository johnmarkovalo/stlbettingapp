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

import Icon from '../../../../components/shared/Icon';
import Styles from '../Styles';
import {palette} from '../../../../theme/colors';
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
            style={localStyles.backButton}>
            <Icon name="ArrowLeft" size={24} color={palette.black} weight="bold" />
          </TouchableOpacity>
          <Text style={Styles.logoText}>{'Reset Status'}</Text>
          <View style={localStyles.placeholder} />
        </View>

        <View style={localStyles.container}>
          <View style={localStyles.contentContainer}>
            {/* Info Section */}
            <View style={localStyles.infoContainer}>
              <Icon
                name="Info"
                size={24}
                color={palette.primary[500]}
                weight="bold"
              />
              <Text style={localStyles.infoText}>
                This tool resets all transaction statuses to "printed" for a
                specific date and draw. This allows them to be re-synced to the
                server.
              </Text>
            </View>

            {/* Date Selector */}
            <View style={localStyles.sectionContainer}>
              <Text style={localStyles.sectionTitle}>Select Date</Text>
              <View style={localStyles.dateSelector}>
                <TouchableOpacity
                  style={localStyles.dateArrowButton}
                  onPress={() => adjustDate(-1)}>
                  <Icon
                    name="CaretLeft"
                    size={32}
                    color={palette.primary[500]}
                    weight="bold"
                  />
                </TouchableOpacity>
                <View style={localStyles.dateDisplay}>
                  <Text style={localStyles.dateText}>
                    {formatDateForDisplay(selectedDate)}
                  </Text>
                  <Text style={localStyles.dateSubText}>{selectedDate}</Text>
                </View>
                <TouchableOpacity
                  style={localStyles.dateArrowButton}
                  onPress={() => adjustDate(1)}>
                  <Icon
                    name="CaretRight"
                    size={32}
                    color={palette.primary[500]}
                    weight="bold"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Draw Time Selector */}
            <View style={localStyles.sectionContainer}>
              <Text style={localStyles.sectionTitle}>Select Draw Time</Text>
              <View style={localStyles.drawSelector}>
                {DRAW_TIMES.map(draw => (
                  <TouchableOpacity
                    key={draw.value}
                    style={[
                      localStyles.drawButton,
                      selectedDraw === draw.value && localStyles.drawButtonSelected,
                    ]}
                    onPress={() => {
                      setSelectedDraw(draw.value);
                      setTransactionCount(null);
                    }}>
                    <Text
                      style={[
                        localStyles.drawButtonText,
                        selectedDraw === draw.value &&
                          localStyles.drawButtonTextSelected,
                      ]}>
                      {draw.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Check Count Button */}
            <TouchableOpacity
              style={localStyles.checkButton}
              onPress={checkTransactionCount}>
              <Icon name="MagnifyingGlass" size={20} color={palette.primary[500]} weight="bold" />
              <Text style={localStyles.checkButtonText}>Check Transaction Count</Text>
            </TouchableOpacity>

            {transactionCount !== null && (
              <View style={localStyles.countContainer}>
                <Text style={localStyles.countText}>
                  Found {transactionCount} transaction(s)
                </Text>
              </View>
            )}

            {/* Reset Button */}
            <TouchableOpacity
              style={[
                localStyles.resetButton,
                isProcessing && localStyles.resetButtonDisabled,
              ]}
              onPress={handleResetStatus}
              disabled={isProcessing}>
              {isProcessing ? (
                <View style={localStyles.buttonContent}>
                  <ActivityIndicator size="small" color={palette.white} />
                  <Text style={localStyles.resetButtonText}>Processing...</Text>
                </View>
              ) : (
                <View style={localStyles.buttonContent}>
                  <Icon name="ArrowsClockwise" size={20} color={palette.white} weight="bold" />
                  <Text style={localStyles.resetButtonText}>
                    Set Status to Printed
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Warning Section */}
            <View style={localStyles.warningContainer}>
              <Icon
                name="Warning"
                size={20}
                color={palette.secondary[500]}
                weight="bold"
              />
              <Text style={localStyles.warningText}>
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

const localStyles = StyleSheet.create({
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
    backgroundColor: palette.gray[50],
    padding: wp(4),
    borderRadius: 8,
    marginBottom: hp(3),
  },
  infoText: {
    fontSize: 14,
    color: palette.gray[800],
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
    color: palette.gray[800],
    marginBottom: hp(1.5),
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.gray[300],
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
    color: palette.primary[500],
  },
  dateSubText: {
    fontSize: 12,
    color: palette.gray[500],
    marginTop: 2,
  },
  drawSelector: {
    gap: hp(1),
  },
  drawButton: {
    backgroundColor: palette.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.gray[300],
    padding: wp(4),
    alignItems: 'center',
    marginBottom: hp(1),
  },
  drawButtonSelected: {
    backgroundColor: palette.primary[500],
    borderColor: palette.primary[500],
  },
  drawButtonText: {
    fontSize: 16,
    color: palette.gray[800],
    fontWeight: '500',
  },
  drawButtonTextSelected: {
    color: palette.white,
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.primary[500],
    padding: wp(4),
    marginBottom: hp(2),
  },
  checkButtonText: {
    fontSize: 16,
    color: palette.primary[500],
    fontWeight: '500',
    marginLeft: wp(2),
  },
  countContainer: {
    backgroundColor: palette.gray[50],
    borderRadius: 8,
    padding: wp(3),
    alignItems: 'center',
    marginBottom: hp(2),
  },
  countText: {
    fontSize: 16,
    color: palette.gray[800],
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: palette.primary[500],
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
    color: palette.white,
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
