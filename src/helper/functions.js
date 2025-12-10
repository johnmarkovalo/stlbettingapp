import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import NetInfo from '@react-native-community/netinfo';
import Bet from '../models/Bet';

export const sleep = milliseconds => {
  return new Promise(resolve => {
    setTimeout(() => resolve(true), milliseconds);
  });
};

export const wordToNumber = word => {
  const wordMap = {
    zero: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
  };

  let num = 0;
  let currentNum = '';

  for (let i = 0; i < word.length; i++) {
    const char = word[i];

    if (isNaN(char)) {
      currentNum += char;

      if (currentNum in wordMap) {
        num = num * 10 + wordMap[currentNum];
        currentNum = '';
      }
    } else {
      num = num * 10 + Number(char);
    }
  }

  return num;
};

export const getSelected = async () => {
  try {
    const r = await AsyncStorage.getItem('ringtone');
    console.log('getSelected', r);
    return r ? JSON.parse(r) : null;
  } catch (err) {
    console.log('getSelected ERROR', err);
    return null;
  }
};

export const formatUUID = uuid => {
  try {
    return uuid.split('-')[0];
  } catch (e) {
    return uuid;
  }
};

export const capitalizeFirstLetter = str => {
  if (str && str.length > 0) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  } else {
    return str;
  }
};

export const isToday = date => {
  const [day, month, year] = date.split(' ');
  const today = new Date();
  return (
    today.getDate() === parseInt(day) &&
    today.toLocaleString('en', {month: 'short'}) === month &&
    today.getFullYear() === parseInt(year)
  );
};

export const formatNumberWithCommas = value => {
  // Convert the value to a string
  let stringValue = String(value);

  // Split the string into parts before and after the decimal point (if any)
  let parts = stringValue.split('.');
  let integerPart = parts[0];

  // Add commas to the integer part every three digits from the right
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // Return only the integer part without the decimal part
  return '₱' + integerPart;
};

export const formatTime = (hour, minute) => {
  const formattedHour = hour < 10 ? `0${hour}` : `${hour}`;
  const formattedMinute = minute < 10 ? `0${minute}` : `${minute}`;
  return `${formattedHour}:${formattedMinute}`;
};

export const getCurrentDraw = draws => {
  const currentTime = moment();
  const currentTimeStr = currentTime.format('HH:mm');

  // console.log('🕐 getCurrentDraw - Current time:', currentTimeStr);
  // console.log('📅 getCurrentDraw - Draws config:', draws);

  // Find the draw that matches the current time
  const currentDraw = draws.find((draw, index) => {
    const start = moment(draw.start, 'HH:mm');
    const end = moment(draw.end, 'HH:mm');

    // Convert current time to moment for comparison
    const current = moment(currentTimeStr, 'HH:mm');

    // console.log(`🎯 Draw ${index + 1}: ${draw.start} - ${draw.end}`);
    // console.log(
    //   `   Start: ${start.format('HH:mm')}, End: ${end.format('HH:mm')}`,
    // );
    // console.log(`   Current: ${current.format('HH:mm')}`);

    // Use a more reliable time comparison method
    // Convert all times to minutes since midnight for accurate comparison
    const startMinutes = start.hours() * 60 + start.minutes();
    const endMinutes = end.hours() * 60 + end.minutes();
    const currentMinutes = current.hours() * 60 + current.minutes();

    // console.log(
    //   `   Start minutes: ${startMinutes}, End minutes: ${endMinutes}, Current minutes: ${currentMinutes}`,
    // );

    // Check if current time is between start and end (inclusive)
    let isBetween;
    if (startMinutes <= endMinutes) {
      // Normal case: start < end (same day)
      isBetween =
        currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Edge case: start > end (crosses midnight)
      isBetween =
        currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }

    console.log(`   Is between: ${isBetween}`);

    return isBetween;
  });

  if (!currentDraw) {
    // console.log('❌ No active draw found - betting is closed');
    return null;
  }

  const drawIndex = draws.indexOf(currentDraw) + 1;
  console.log(`✅ Active draw found: Draw ${drawIndex}`);
  return drawIndex;
};

export const checkIfTriple = num => {
  //Check if all characters are the same
  const str = String(num);
  return str.split('').every(v => v === str[0]);
};

export const checkIfDouble = num => {
  const numString = String(num);

  for (let i = 0; i < numString.length; i++) {
    for (let j = i + 1; j < numString.length; j++) {
      // Inner loop starts from i + 1
      if (numString[i] === numString[j]) {
        return true;
      }
    }
  }
  return false;
};

export const sortNumber = number => {
  const str = String(number);
  const sorted = str.split('').sort().join('');
  return sorted;
};

export const convertToTransData = bets => {
  let trans_data = '';
  for (let n = 0; n < bets.length; n++) {
    trans_data += bets[n].betNumber;
    trans_data += ' ' + bets[n].targetAmount;
    trans_data += ' ' + bets[n].rambolAmount + ', ';
  }
  return trans_data;
};

export const convertToBets = transData => {
  const bets = [];

  // Clean the trans_data string - remove trailing comma and extra spaces
  const cleanTransData = transData.replace(/,\s*$/, '').trim();
  const transDataArr = cleanTransData.split(', ');

  for (let n = 0; n < transDataArr.length; n++) {
    const betData = transDataArr[n].trim();

    // Skip empty entries
    if (!betData || betData === '') continue;

    // Split by one or more spaces to handle multiple spaces
    const bet = betData.split(/\s+/);

    // Ensure we have all three parts: betNumber, targetAmount, rambolAmount
    if (bet.length >= 3) {
      const betNumber = bet[0];
      const targetAmountRaw = bet[1];
      const rambolAmountRaw = bet[2];

      // More robust number parsing
      const targetAmount = parseInt(targetAmountRaw, 10) || 0;
      const rambolAmount = parseInt(rambolAmountRaw, 10) || 0;

      bets.push({
        betNumber: betNumber,
        targetAmount: targetAmount,
        rambolAmount: rambolAmount,
        tranno: n + 1, // Add tranno (transaction number)
        subtotal: targetAmount + rambolAmount, // Calculate subtotal
      });
    } else {
      console.warn(`⚠️ Bet ${n + 1} has insufficient parts:`, bet);
    }
  }
  return bets;
};

// Convert bet objects back to trans_data string format
export const convertBetsToTransData = bets => {
  if (!Array.isArray(bets) || bets.length === 0) {
    return '';
  }

  return bets
    .map(bet => {
      const betNumber = bet.betNumber || '';
      const targetAmount = bet.targetAmount || 0;
      const rambolAmount = bet.rambolAmount || 0;

      return `${betNumber} ${targetAmount} ${rambolAmount}`;
    })
    .join(', ');
};

export const formatBetTypes = betTypes => {
  return betTypes.map(betType => {
    const {
      id,
      bettype,
      bettypeid,
      limits,
      capping,
      wintar,
      winram,
      winram2,
      start11,
      start11m,
      end11,
      end11m,
      start4,
      start4m,
      end4,
      end4m,
      start9,
      start9m,
      end9,
      end9m,
    } = betType;
    const draws = [
      {
        start: formatTime(start11, start11m),
        end: formatTime(end11, end11m),
      },
      {start: formatTime(start4, start4m), end: formatTime(end4, end4m)},
      {start: formatTime(start9, start9m), end: formatTime(end9, end9m)},
    ];
    return {
      id: bettypeid,
      bettypeid: bettypeid,
      name: bettype,
      limit: limits,
      capping,
      wintar,
      winram,
      winram2,
      draws,
    };
  });
};

// Check if current time is within 15 minutes before draw cutoff
export const isWithin15MinutesOfCutoff = (draws, currentDraw) => {
  try {
    // Safety checks to prevent crashes
    if (!draws || !Array.isArray(draws) || draws.length === 0) {
      return false;
    }
    
    if (!currentDraw || currentDraw < 1 || currentDraw > draws.length) {
      return false;
    }

    const draw = draws[currentDraw - 1];
    if (!draw || !draw.end || typeof draw.end !== 'string') {
      return false;
    }

    const currentTime = moment();
    if (!currentTime.isValid()) {
      console.error('Invalid current time in isWithin15MinutesOfCutoff');
      return false;
    }

    const endTime = moment(draw.end, 'HH:mm');
    if (!endTime.isValid()) {
      console.error('Invalid end time format:', draw.end);
      return false;
    }
    
    // Set today's date for endTime
    endTime.year(currentTime.year());
    endTime.month(currentTime.month());
    endTime.date(currentTime.date());

    // Handle case where end time is next day (crosses midnight)
    if (endTime.isBefore(currentTime)) {
      endTime.add(1, 'day');
    }

    const minutesUntilCutoff = endTime.diff(currentTime, 'minutes');
    
    // Return true if within 15 minutes of cutoff
    return minutesUntilCutoff >= 0 && minutesUntilCutoff <= 15;
  } catch (error) {
    console.error('Error in isWithin15MinutesOfCutoff:', error);
    return false; // Return false on error to prevent crashes
  }
};

// Calculate combination amounts from transactions
// Returns: { [betTypeId_draw_combination]: totalAmount }
export const calculateCombinationAmounts = (transactions, betsByTransaction) => {
  const amounts = {};
  const fifteenMinutesAgo = moment().subtract(15, 'minutes');

  transactions.forEach(transaction => {
    const created_at = moment(transaction.created_at);
    
    // Only count transactions from last 15 minutes
    if (created_at.isAfter(fifteenMinutesAgo)) {
      const bets = betsByTransaction[transaction.id] || [];
      const key = `${transaction.bettypeid}_${transaction.bettime}`;

      bets.forEach(bet => {
        // Handle both database format (betnumber, target, rambol) and model format (betNumber, targetAmount, rambolAmount)
        const betNumber = bet.betnumber || bet.betNumber || '';
        const targetAmount = bet.target || bet.targetAmount || 0;
        const rambolAmount = bet.rambol || bet.rambolAmount || 0;

        // For target: use exact bet number
        if (targetAmount > 0 && betNumber) {
          const targetKey = `${key}_target_${betNumber}`;
          if (!amounts[targetKey]) {
            amounts[targetKey] = 0;
          }
          amounts[targetKey] += targetAmount;
        }

        // For rambol: use sorted bet number (123 and 321 are same)
        if (rambolAmount > 0 && betNumber) {
          const sortedNumber = sortNumber(betNumber);
          const rambolKey = `${key}_rambol_${sortedNumber}`;
          if (!amounts[rambolKey]) {
            amounts[rambolKey] = 0;
          }
          amounts[rambolKey] += rambolAmount;
        }
      });
    }
  });

  return amounts;
};

// Calculate POS combination amounts from transactions (for entire draw, not just 15 minutes)
// Returns: { [betTypeId_draw_combination]: totalAmount }
// Same logic as calculateCombinationAmounts but includes all transactions in the draw
export const calculatePOSCombinationAmounts = (transactions, betsByTransaction) => {
  const amounts = {};

  transactions.forEach(transaction => {
    const bets = betsByTransaction[transaction.id] || [];
    const key = `${transaction.bettypeid}_${transaction.bettime}`;

    bets.forEach(bet => {
      // Handle both database format (betnumber, target, rambol) and model format (betNumber, targetAmount, rambolAmount)
      const betNumber = bet.betnumber || bet.betNumber || '';
      const targetAmount = bet.target || bet.targetAmount || 0;
      const rambolAmount = bet.rambol || bet.rambolAmount || 0;

      // For target: use exact bet number
      if (targetAmount > 0 && betNumber) {
        const targetKey = `${key}_target_${betNumber}`;
        if (!amounts[targetKey]) {
          amounts[targetKey] = 0;
        }
        amounts[targetKey] += targetAmount;
      }

      // For rambol: use sorted bet number (123 and 321 are same)
      if (rambolAmount > 0 && betNumber) {
        const sortedNumber = sortNumber(betNumber);
        const rambolKey = `${key}_rambol_${sortedNumber}`;
        if (!amounts[rambolKey]) {
          amounts[rambolKey] = 0;
        }
        amounts[rambolKey] += rambolAmount;
      }
    });
  });

  return amounts;
};

export const checkInternetConnection = () => {
  let isConnected = false;
  let isSlow = true; // New variable for slow connection

  const updateConnectionStatus = state => {
    // Rough speed check (adjust threshold as needed)
    isConnected = state.isInternetReachable;
    if (isConnected) {
      if (state.details && state.details.strength < 50) {
        isSlow = true;
      } else {
        isSlow = false;
      }
    }
  };

  NetInfo.addEventListener(updateConnectionStatus);

  const cleanup = () => NetInfo.removeEventListener(updateConnectionStatus);

  return {
    isConnected: () => isConnected,
    isSlow: () => isSlow,
    cleanup,
  };
};

export const convertDateTime = timestamp => {
  const dateComponents = timestamp.split(/[- :]/); // Split by delimiters

  const date = new Date(
    ...dateComponents.map(Number), // Convert strings to numbers
  );
  let hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12; // Convert to 12-hour clock
  hours = hours ? hours : 12; // Handle midnight (12 AM should stay as 12)

  const minutes = date.getMinutes().toString().padStart(2, '0'); // Ensure 2-digit minutes

  const formattedTime = `${hours}:${minutes} ${ampm}`;

  return formattedTime;
};
