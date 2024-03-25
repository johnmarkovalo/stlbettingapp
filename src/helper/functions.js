import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const sleep = (milliseconds) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), milliseconds);
  });
};

export function formatUSNumber(entry = "") {
  const match = entry;

  if (match.length > 1) {
    if (match[0] === "+" && match[1] === "1") {
      const pref = "+1 ";
      const part1 = match.length > 2 ? `(${match.substring(2, 5)})` : "";
      const part2 = match.length > 5 ? ` ${match.substring(5, 8)}` : "";
      const part3 =
        match.length > 8 ? `-${match.substring(8, entry.length)}` : "";
      return `${pref}${part1}${part2}${part3}`;
    }
  }

  let part1 = match.length > 3 ? `${match.substring(0, 3)}` : match;
  // part1 = match.length > 5 ? `(${match.substring(0, 3)})` : part1
  const part2 = match.length > 3 ? `-${match.substring(3, 6)}` : "";
  const part3 = match.length > 6 ? `-${match.substring(6, entry.length)}` : "";
  return `${part1}${part2}${part3}`;
}

export function formalizeNumber(phoneNumbers) {
  return phoneNumbers.map((item) => {
    let formalizedNumber = "";
    if (item.value) {
      formalizedNumber = item.value;
    } else {
      formalizedNumber = item.number.replace(/[^0-9]/g, "");
    }
    return {
      ...item,
      formalizedNumber,
    };
  });
}

export const getAvatarInitials = (textString) => {
  if (!textString) return "";

  const text = textString.trim();

  const textSplit = text.split(" ");

  if (textSplit.length <= 1) return text.charAt(0);

  const initials =
    textSplit[0].charAt(0) + textSplit[textSplit.length - 1].charAt(0);

  return initials;
};

export const wordToNumber = (word) => {
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
  let currentNum = "";

  for (let i = 0; i < word.length; i++) {
    const char = word[i];

    if (isNaN(char)) {
      currentNum += char;

      if (currentNum in wordMap) {
        num = num * 10 + wordMap[currentNum];
        currentNum = "";
      }
    } else {
      num = num * 10 + Number(char);
    }
  }

  return num;
};

export function validateE164PhoneNumber(phoneNumber) {
  const e164Pattern = /^\+[1-9]\d{1,14}$/; // Regular expression for E.164 format

  return e164Pattern.test(phoneNumber);
}

export function convertToE164PhoneNumber(phoneNumber, countryCode = "1") {
  // Remove non-digit characters
  const cleanedNumber = phoneNumber.replace(/\D/g, "");

  // Add country code with plus sign
  const e164Number = `+${countryCode}${cleanedNumber}`;

  return e164Number;
}

export const getSelected = async () => {
  try {
    const r = await AsyncStorage.getItem("ringtone");
    console.log("getSelected", r);
    return r ? JSON.parse(r) : null;
  } catch (err) {
    console.log("getSelected ERROR", err);
    return null;
  }
};

export const formatUUID = (uuid) => {
  try {
    return uuid.split("-")[0];
  } catch (e) {
    return uuid;
  }
};

export const capitalizeFirstLetter = (str) => {
  if (str && str.length > 0) {
      return str.charAt(0).toUpperCase() + str.slice(1);
  } else {
      return str;
  }
}

export const isIOS = Platform.OS === "ios";

export const findContactByNumber = (contacts, numberToFind) => {
  // Iterate over each key in the contacts object
  for (const key in contacts) {
    if (contacts.hasOwnProperty(key)) {
      // Search in the current array
      const found = contacts[key].find(
        (contact) => contact.number === numberToFind
      );
      if (found) {
        return found;
      }
    }
  }
  return null; // Return null if no contact is found
}

export const isToday = (date) => {
  const [day, month, year] = date.split(" ");
  const today = new Date();
  return (
    today.getDate() === parseInt(day) &&
    today.toLocaleString("en", { month: "short" }) === month &&
    today.getFullYear() === parseInt(year)
  );
};