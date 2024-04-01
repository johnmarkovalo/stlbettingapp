import AsyncStorage from '@react-native-async-storage/async-storage';

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
