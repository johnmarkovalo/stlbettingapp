import ThermalPrinterModule from 'react-native-thermal-printer';
import {useSelector} from 'react-redux';
import {checkIfDouble} from '.';
import moment from 'moment';
async function printSales(betDate, betTime, betType, totalAmount, user) {
  const infoHeader = `${moment(betDate).format('MM-DD-YYYY')} | ${betTime == 1 ? '1st' : betTime == 2 ? '2nd' : '3rd'} Draw | ${betType}`;
  const dateTime = moment().format('MM-DD-YYYY HH:mm:ss');
  const total = 'TOTAL SALES: <b>' + totalAmount + '.00</b>';
  const textToPrint =
    padStringToLength32(infoHeader) +
    padStringToLength32(dateTime) +
    padStringToLength32(user.agent_name) +
    '--------------------------------' +
    '\n' +
    padStringToLength32(total) +
    '\n\n' +
    '  ____________________________  ' +
    "       Teller's Signature       " +
    '\n\n ';
  print(textToPrint);
}

async function printHits(betDate, betTime, betType, totalAmount,user) {
  const infoHeader = `${moment(betDate).format('MM-DD-YYYY')} | ${betTime == 1 ? '1st' : betTime == 2 ? '2nd' : '3rd'} Draw | ${betType}`;
  const dateTime = moment().format('MM-DD-YYYY HH:mm:ss');
  const totalTarget = 'TARGET:' + totalAmount.totalTarget + '.00';
  const totalRambol = 'RAMBOL:' + totalAmount.totalRambol + '.00';
  const textToPrint =
    padStringToLength32(infoHeader) +
    padStringToLength32(dateTime) +
    padStringToLength32(user.agent_name) +
    '--------------------------------' +
    '\n' +
    justifySpaceBetween2(totalTarget, totalRambol) +
    '\n\n' +
    '  ____________________________  ' +
    "       Teller's Signature       " +
    '\n\n ';
  print(textToPrint);
}

async function printTransaction(transaction, betType, bets, user) {
  const infoHeader = `${moment(transaction.betdate).format('MM-DD-YYYY')} | ${transaction.bettime == 1 ? '1st' : transaction.bettime == 2 ? '2nd' : '3rd'} Draw | ${betType.name.replace(/\s/g, '')}`;
  const dateTime = moment().format('MM-DD-YYYY HH:mm:ss');
  const ticket = `${transaction.ticketcode}`;
  const total = `TOTAL: <b>${transaction.total}.00</b>`;
  let betString = '';
  await bets.forEach(bet => {
    let target = bet.targetAmount.toString() + ' T';
    let rambol = bet.rambolAmount.toString() + ' R';
    betString += justifySpaceBetween(bet.betNumber, target, rambol);
  });
  const textToPrint =
    // '<img>http://philippinestl.com/downloads/zianLogo.png</img>\n' +
    '--------------------------------' +
    '       SMALL TOWN LOTTERY       ' +
    '              ZIAN              ' +
    '--------------------------------' +
    padStringToLength32(infoHeader) +
    padStringToLength32('Printed: ' + dateTime) +
    '<b>' +
    padStringToLength32(ticket) +
    '</b>' +
    padStringToLength32('Agent: ' + user.agent_series) +
    padStringToLength32(user.agent_name) +
    '                                ' +
    padStringToLength32('1PHP T WINS ' + betType.wintar) +
    padStringToLength32('1PHP R WINS ' + betType.winram) +
    padStringToLength32('1PHP Double R WINS ' + betType.winram2) +
    '                                ' +
    'No.          Target       Rambol' +
    '--------------------------------' +
    betString +
    '--------------------------------' +
    padStringToLength32(total) +
    '                                       ' +
    '      Valid for 1 month after   ' +
    '   betting, otherwise forfeited ' +
    '       No Ticket, No Payout     ' +
    '                                ' +
    '\n\n' +
    '  ____________________________  ' +
    "    Ticket Holder's Signature   " +
    '                                ' +
    "\n<qrcode size='25'>" +
    ticket +
    '</qrcode>\n ' +
    '\n\n ';
  print(textToPrint);
}

async function print(text) {
  try {
    ThermalPrinterModule.defaultConfig = {
      ...ThermalPrinterModule.defaultConfig,
      timeout: 30000,
      macAddress: '00:11:22:33:44:55',
    };
    await ThermalPrinterModule.printBluetooth({
      payload: text,
      macAddress: '00:11:22:33:44:55',
    });
    console.log('Done printing');
  } catch (error) {
    console.error('Error printing:', error);
  }
}

async function listPairedDevices() {
  try {
    const pairedDevices = await ThermalPrinterModule.getBluetoothDeviceList();
    console.log('Paired Bluetooth Devices:', pairedDevices);
  } catch (error) {
    console.error('Error listing devices:', error);
  }
}

function padStringToLength32(inputString) {
  // Get the length of the input string
  var length = inputString.length;

  // Calculate how many spaces need to be added
  var spacesToAdd = 32 - length;

  // Check if the string is already longer than 32 characters
  if (spacesToAdd <= 0) {
    // If so, return the input string as it is
    return inputString;
  }

  // Add spaces at the start and end of the string
  var paddedString =
    ' '.repeat(Math.floor(spacesToAdd / 2)) +
    inputString +
    ' '.repeat(Math.ceil(spacesToAdd / 2));

  return paddedString;
}

function justifySpaceBetween(str1, str2, str3) {
  // Calculate the length of each string
  var length2 = str2.length;
  var length3 = str3.length;

  var spacesBetween1 = 15 - length2;
  var spacesBetween2 = 14 - length3;

  // Construct the resulting string with spaces added between the input strings
  var result =
    str1 +
    ' '.repeat(spacesBetween1) +
    str2 +
    ' '.repeat(spacesBetween2) +
    str3;

  return result;
}

function justifySpaceBetween2(str1, str2) {
  // Calculate the length of each string
  var length1 = str1.length;
  var length2 = str2.length;

  var spacesBetween1 = 32 - length1 - length2;
  // Construct the resulting string with spaces added between the input strings
  var result =
    '<b>'+str1 +
    ' '.repeat(spacesBetween1) +
    str2+'</b>';
  return result;
}

function formatNumberWithCommas(value) {
  // Convert the value to a string
  let stringValue = String(value);

  // Split the string into parts before and after the decimal point (if any)
  let parts = stringValue.split('.');
  let integerPart = parts[0];

  // Add commas to the integer part every three digits from the right
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // Return only the integer part without the decimal part
  return integerPart;
}

export {printSales, printTransaction, printHits, listPairedDevices};
