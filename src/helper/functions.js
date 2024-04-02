import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

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
  const currentTime = moment().format('HH:mm');

  // Find the draw that matches the current time
  const currentDraw = draws.find(draw => {
    const start = moment(draw.start, 'HH:mm');
    const end = moment(draw.end, 'HH:mm');
    return moment(currentTime, 'HH:mm').isBetween(start, end);
  });
  if (!currentDraw) {
    return null;
  }
  return draws.indexOf(currentDraw) + 1;
};

export const checkIfTriple = num => {
  //Check if all characters are the same
  const str = String(num);
  return str.split('').every(v => v === str[0]);
};

export const sortNumber = number => {
  const str = String(number);
  const sorted = str.split('').sort().join('');
  return sorted;
};

export const convertToTransData = bets => {
  let transdata = '';
  for (let n = 0; n < bets.length; n++) {
    transdata += bets[n].betNumber;
    transdata += ' ' + bets[n].targetAmount;
    transdata += ' ' + bets[n].rambolAmount + ', ';
  }
  return transdata;
};
