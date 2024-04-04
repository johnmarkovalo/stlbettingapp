import ThermalPrinterModule from 'react-native-thermal-printer';
import moment from 'moment';

async function printSales(betDate, betTime, betType, totalAmount) {
  const infoHeader = `${moment(betDate).format('YYYY-MM-DD')} | ${betTime == 1 ? '1st' : betTime == 2 ? '2nd' : '3rd'} Draw | ${betType}`;
  const dateTime = moment().format('MM-DD-YYYY HH:mm:ss');
  const total = 'TOTAL: PHP' + totalAmount + '.00';
  const textToPrint =
    padStringToLength32(infoHeader) +
    padStringToLength32(dateTime) +
    '--------------------------------' +
    '\n' +
    padStringToLength32(total) +
    '\n\n' +
    '  ____________________________  ' +
    "       Teller's Signature       " +
    '\n\n ';
  try {
    ThermalPrinterModule.defaultConfig = {
      ...ThermalPrinterModule.defaultConfig,
      timeout: 30000,
      macAddress: '00:11:22:33:44:55',
    };
    await ThermalPrinterModule.printBluetooth({
      payload: textToPrint,
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

export {printSales, listPairedDevices};
