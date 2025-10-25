import ThermalPrinterModule from 'react-native-thermal-printer';
import {useSelector} from 'react-redux';
import {checkIfDouble} from '.';
import moment from 'moment';

// Global print queue to prevent multiple simultaneous print jobs
let isPrinting = false;
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

async function printHits(betDate, betTime, betType, totalAmount, user) {
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
    "\n<qrcode size='20'>" +
    ticket +
    '</qrcode>\n ' +
    '\n\n ';
  print(textToPrint);
}

async function print(text, retryCount = 0) {
  const maxRetries = 2;

  // Check if another print job is in progress
  if (isPrinting) {
    console.log('Print job already in progress, waiting...');
    // Wait for current job to complete
    while (isPrinting) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  isPrinting = true;

  try {
    // Check printer connection before attempting to print
    const isConnected = await checkPrinterConnection();
    if (!isConnected) {
      throw new Error('Printer not connected or not found');
    }

    // Reset printer connection to ensure clean state
    await resetPrinterConnection();

    ThermalPrinterModule.defaultConfig = {
      ...ThermalPrinterModule.defaultConfig,
      timeout: 30000,
      macAddress: '00:11:22:33:44:55',
    };

    // Split text into chunks to avoid buffer overflow
    const textSize = estimateTextSize(text);
    let maxChunkSize = 1500; // Leave some buffer space (printer buffer is 2048)

    // If text is extremely large, use smaller chunk size
    if (textSize > 10000) {
      console.warn('Large text detected, using smaller chunk size');
      maxChunkSize = 1000;
    }

    const chunks = splitTextIntoChunks(text, maxChunkSize);

    console.log(
      `Printing ${chunks.length} chunks of data (${textSize} bytes total, attempt ${retryCount + 1})`,
    );

    for (let i = 0; i < chunks.length; i++) {
      console.log(`Printing chunk ${i + 1}/${chunks.length}`);

      let chunkRetryCount = 0;
      let chunkSuccess = false;

      while (chunkRetryCount < 3 && !chunkSuccess) {
        try {
          await ThermalPrinterModule.printBluetooth({
            payload: chunks[i],
            macAddress: '00:11:22:33:44:55',
          });
          chunkSuccess = true;
        } catch (chunkError) {
          chunkRetryCount++;
          console.warn(
            `Chunk ${i + 1} failed, retry ${chunkRetryCount}/3:`,
            chunkError.message,
          );

          // Check if it's a buffer overflow error
          if (
            chunkError.message.includes('src.length') &&
            chunkError.message.includes('dst.length')
          ) {
            console.error('Buffer overflow detected, reducing chunk size');
            // Try with a much smaller chunk
            const smallerChunk = chunks[i].substring(0, 500);
            try {
              await ThermalPrinterModule.printBluetooth({
                payload: smallerChunk,
                macAddress: '00:11:22:33:44:55',
              });
              chunkSuccess = true;
              console.log(`Chunk ${i + 1} printed with reduced size`);
            } catch (smallerError) {
              console.error('Even smaller chunk failed:', smallerError.message);
            }
          }

          if (!chunkSuccess && chunkRetryCount < 3) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 500));
          } else if (!chunkSuccess) {
            throw chunkError;
          }
        }
      }

      // Add a small delay between chunks to allow printer to process
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Clear printer buffer after successful printing
    await clearPrinterBuffer();

    // Add a delay to ensure printer is ready for next job
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Done printing');
  } catch (error) {
    console.error('Error printing:', error);

    // Retry the entire print job if we haven't exceeded max retries
    if (retryCount < maxRetries) {
      console.log(`Retrying print job (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return print(text, retryCount + 1);
    } else {
      console.error('Print job failed after all retries');
      throw error;
    }
  } finally {
    // Always release the print lock
    isPrinting = false;
  }
}

function splitTextIntoChunks(text, maxChunkSize) {
  const chunks = [];
  let currentChunk = '';

  // Split by lines to avoid breaking in the middle of a line
  const lines = text.split('\n');

  for (const line of lines) {
    // If adding this line would exceed the chunk size, start a new chunk
    if (
      currentChunk.length + line.length + 1 > maxChunkSize &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk);
      currentChunk = line;
    } else {
      currentChunk += (currentChunk.length > 0 ? '\n' : '') + line;
    }
  }

  // Add the last chunk if it has content
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function estimateTextSize(text) {
  // Rough estimation of text size in bytes (UTF-8)
  // Most characters are 1 byte, but some special characters might be more
  return Buffer.byteLength(text, 'utf8');
}

async function listPairedDevices() {
  try {
    const pairedDevices = await ThermalPrinterModule.getBluetoothDeviceList();
    console.log('Paired Bluetooth Devices:', pairedDevices);
    return pairedDevices;
  } catch (error) {
    console.error('Error listing devices:', error);
    return [];
  }
}

async function checkPrinterConnection() {
  try {
    const devices = await listPairedDevices();
    const targetDevice = devices.find(
      device => device.macAddress === '00:11:22:33:44:55',
    );

    if (targetDevice) {
      console.log('Printer connection available:', targetDevice.deviceName);
      return true;
    } else {
      console.warn('Target printer not found in paired devices');
      return false;
    }
  } catch (error) {
    console.error('Error checking printer connection:', error);
    return false;
  }
}

async function clearPrinterBuffer() {
  try {
    console.log('Clearing printer buffer...');

    // Send ESC/POS commands to clear buffer and reset printer
    const clearCommands = [
      '\x1B\x40', // ESC @ - Initialize printer
      '\x1B\x61\x00', // ESC a 0 - Left alignment
      '\x0A', // Line feed
      '\x0A', // Line feed
      '\x0A', // Line feed
    ].join('');

    await ThermalPrinterModule.printBluetooth({
      payload: clearCommands,
      macAddress: '00:11:22:33:44:55',
    });

    // Wait a bit for the printer to process the clear commands
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('Printer buffer cleared');
  } catch (error) {
    console.warn('Error clearing printer buffer:', error.message);
    // Don't throw error here as it's not critical
  }
}

async function resetPrinterConnection() {
  try {
    console.log('Resetting printer connection...');

    // Clear buffer first
    await clearPrinterBuffer();

    // Wait a bit longer to ensure printer is ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Printer connection reset');
  } catch (error) {
    console.warn('Error resetting printer connection:', error.message);
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
  var result = '<b>' + str1 + ' '.repeat(spacesBetween1) + str2 + '</b>';
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

export {
  printSales,
  printTransaction,
  printHits,
  listPairedDevices,
  checkPrinterConnection,
  clearPrinterBuffer,
  resetPrinterConnection,
};
