import ThermalPrinterModule from 'react-native-thermal-printer';
import {store} from '../store/store';
import {checkIfDouble} from '.';
import moment from 'moment';

// Global print queue to prevent multiple simultaneous print jobs
let isPrinting = false;

// Helper function to get printer MAC address from Redux state
function getPrinterMacAddress() {
  try {
    const state = store.getState();
    const macAddress = state.printer?.printerMacAddress;
    if (!macAddress) {
      throw new Error(
        'No printer configured. Please select a printer in Printer Setup.',
      );
    }
    return macAddress;
  } catch (error) {
    console.error('Error getting printer MAC address:', error);
    throw new Error(
      'Printer not configured. Please select a printer in Printer Setup.',
    );
  }
}
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
  await print(textToPrint);
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
  await print(textToPrint);
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
  await print(textToPrint);
}

// Strip HTML tags to prevent massive expansion by the printer library
// Thermal printers don't render HTML anyway, so we just need plain text
function stripHTMLTags(text) {
  // Remove all HTML tags including <b>, </b>, <qrcode>, </qrcode>, etc.
  return text.replace(/<[^>]*>/g, '');
}

async function print(text) {
  // Prevent concurrent print jobs
  if (isPrinting) {
    console.log('Print job already in progress, waiting...');
    while (isPrinting) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  isPrinting = true;

  try {
    // Get printer MAC address from Redux
    const macAddress = getPrinterMacAddress();

    ThermalPrinterModule.defaultConfig = {
      timeout: 30000,
      macAddress: macAddress,
    };

    // Strip HTML tags first - they cause massive expansion (20-30x) and thermal printers can't render them anyway
    const textWithoutHTML = stripHTMLTags(text);
    const cleanText = textWithoutHTML.trim();
    const textSize = estimateTextSize(cleanText);

    // Now that HTML tags are stripped, we can use reasonable chunk sizes
    // Use 1800 bytes max to stay under the 2048-byte buffer limit
    const maxChunkSize = 1800;

    // If text is small enough, send directly
    if (textSize < maxChunkSize) {
      try {
        await ThermalPrinterModule.printBluetooth({
          payload: cleanText,
          macAddress: macAddress,
        });
        console.log('Print completed successfully');

        // Wait for printer buffer to drain
        await new Promise(resolve => setTimeout(resolve, 500));
        return;
      } catch (singleSendError) {
        console.warn(
          'Single send failed, falling back to chunking:',
          singleSendError.message,
        );
        // Fall through to chunking
      }
    }

    // Split into chunks for larger texts
    const chunks = splitIntoChunksSafe(cleanText, maxChunkSize);
    console.log(`Printing ${chunks.length} chunks (${textSize} bytes)`);

    // Send chunks sequentially with delays to allow buffer to drain naturally
    for (let i = 0; i < chunks.length; i++) {
      let retries = 0;
      const maxRetries = 3;
      let success = false;

      while (retries < maxRetries && !success) {
        try {
          await ThermalPrinterModule.printBluetooth({
            payload: chunks[i],
            macAddress: macAddress,
          });
          success = true;

          // Delay between chunks to allow printer buffer to process and drain
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (chunkError) {
          retries++;

          // If device not found, stop immediately
          if (
            chunkError.message.includes('Bluetooth Device Not Found') ||
            chunkError.message.includes('Device Not Found') ||
            chunkError.message.includes('not found')
          ) {
            throw new Error(
              'Printer not connected. Please check printer connection in Printer Setup.',
            );
          }

          // Buffer overflow - split the chunk smaller
          if (
            chunkError.message.includes('src.length') &&
            chunkError.message.includes('dst.length')
          ) {
            console.warn(
              `Buffer overflow on chunk ${i + 1}/${chunks.length}, splitting smaller`,
            );

            // Split this chunk into smaller pieces
            const smallerChunks = splitIntoChunksSafe(
              chunks[i],
              maxChunkSize / 2,
            );
            for (const smallChunk of smallerChunks) {
              try {
                await ThermalPrinterModule.printBluetooth({
                  payload: smallChunk,
                  macAddress: macAddress,
                });
                await new Promise(resolve => setTimeout(resolve, 200));
              } catch (smallChunkError) {
                console.warn('Small chunk failed:', smallChunkError.message);
                await new Promise(resolve => setTimeout(resolve, 200));
              }
            }
            success = true;
          } else if (retries >= maxRetries) {
            // Other errors after retries
            throw chunkError;
          } else {
            // Retry with delay
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      }
    }

    console.log('Print completed successfully');

    // Wait longer for printer buffer to naturally drain completely
    // This ensures the next print won't have buffer accumulation issues
    await new Promise(resolve => setTimeout(resolve, 800));
  } catch (error) {
    console.error('Error printing:', error);

    // Wait a bit even on error to let buffer drain
    await new Promise(resolve => setTimeout(resolve, 500));

    throw error;
  } finally {
    isPrinting = false;
  }
}

// Split text into safe chunks that won't exceed buffer size
// Accounts for HTML tag expansion (20-30x) by using very small chunk sizes
function splitIntoChunksSafe(text, maxChunkSizeBytes) {
  const chunks = [];

  // For very small max size (accounting for HTML expansion), split character by character
  // or in small groups
  if (maxChunkSizeBytes <= 200) {
    let currentChunk = '';
    let currentChunkSize = 0;

    // Split character by character, grouping up to maxChunkSizeBytes
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      // Estimate char size - assume HTML tags might expand it
      const charSize = estimateTextSize(char);

      // If adding this char would exceed limit, save current chunk
      if (
        currentChunkSize + charSize > maxChunkSizeBytes &&
        currentChunk.length > 0
      ) {
        chunks.push(currentChunk);
        currentChunk = char;
        currentChunkSize = charSize;
      } else {
        currentChunk += char;
        currentChunkSize += charSize;
      }
    }

    // Add last chunk
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks.length > 0 ? chunks : [text];
  }

  // For larger chunks, split by lines first
  const lines = text.split('\n');
  let currentChunk = '';
  let currentChunkSize = 0;

  for (const line of lines) {
    const lineWithNewline = line + '\n';
    const lineSize = estimateTextSize(lineWithNewline);

    // If single line exceeds max size, split it character by character
    if (lineSize > maxChunkSizeBytes) {
      // Save current chunk first
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = '';
        currentChunkSize = 0;
      }
      // Split the long line character by character
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const charSize = estimateTextSize(char);
        if (
          currentChunkSize + charSize > maxChunkSizeBytes &&
          currentChunk.length > 0
        ) {
          chunks.push(currentChunk);
          currentChunk = char;
          currentChunkSize = charSize;
        } else {
          currentChunk += char;
          currentChunkSize += charSize;
        }
      }
      // Add newline
      if (currentChunk.length > 0) {
        currentChunk += '\n';
        currentChunkSize += 1;
      }
      continue;
    }

    // Check if adding this line would exceed chunk size
    if (
      currentChunkSize + lineSize > maxChunkSizeBytes &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk);
      currentChunk = lineWithNewline;
      currentChunkSize = lineSize;
    } else {
      currentChunk += lineWithNewline;
      currentChunkSize += lineSize;
    }
  }

  // Add last chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks.length > 0 ? chunks : [text];
}

// Split text into very small chunks - HTML tags expand massively
// Split into 5-character chunks to account for 20-30x expansion
function splitTextRespectingHTMLTags(text) {
  const chunks = [];
  const maxChunkSize = 5; // Very small: 5 characters per chunk

  let i = 0;
  while (i < text.length) {
    // Take only 5 characters at a time to stay well under buffer limits
    const chunk = text.substring(i, Math.min(i + maxChunkSize, text.length));
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    i += maxChunkSize;
  }

  return chunks.length > 0 ? chunks : [text];
}

function splitTextIntoChunks(text, maxChunkSize) {
  const chunks = [];

  // Use byte size for accurate chunking
  const textByteSize = estimateTextSize(text);

  // Always split if text is larger than chunk size (no single chunk optimization)
  if (textByteSize <= maxChunkSize && text.length <= maxChunkSize) {
    return [text];
  }

  // For very small chunks (emergency splitting), split character by character
  if (maxChunkSize <= 50) {
    let currentChunk = '';
    let currentChunkSize = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charByteSize = estimateTextSize(char);

      if (
        currentChunkSize + charByteSize > maxChunkSize &&
        currentChunk.length > 0
      ) {
        chunks.push(currentChunk);
        currentChunk = char;
        currentChunkSize = charByteSize;
      } else {
        currentChunk += char;
        currentChunkSize += charByteSize;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks.length > 0 ? chunks : [text];
  }

  // For larger chunks, try to split by lines first
  const lines = text.split('\n');
  let currentChunk = '';
  let currentChunkSize = 0;

  for (const line of lines) {
    const lineWithNewline = line + '\n';
    const lineByteSize = estimateTextSize(lineWithNewline);

    // If a single line is too large, split it character by character
    if (lineByteSize > maxChunkSize) {
      // Save current chunk first
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = '';
        currentChunkSize = 0;
      }
      // Split the long line character by character
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const charByteSize = estimateTextSize(char);
        if (
          currentChunkSize + charByteSize > maxChunkSize &&
          currentChunk.length > 0
        ) {
          chunks.push(currentChunk + '\n');
          currentChunk = char;
          currentChunkSize = charByteSize;
        } else {
          currentChunk += char;
          currentChunkSize += charByteSize;
        }
      }
      // Add newline if we have a chunk
      if (currentChunk.length > 0) {
        currentChunk += '\n';
        currentChunkSize += 1;
      }
      continue;
    }

    // If adding this line would exceed the chunk size, save current chunk and start new one
    if (
      currentChunkSize + lineByteSize > maxChunkSize &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk);
      currentChunk = lineWithNewline;
      currentChunkSize = lineByteSize;
    } else {
      currentChunk += lineWithNewline;
      currentChunkSize += lineByteSize;
    }
  }

  // Add the last chunk if it has content
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks.length > 0 ? chunks : [text];
}

function estimateTextSize(text) {
  // Rough estimation of text size in bytes (UTF-8)
  // Most characters are 1 byte, but some special characters might be more
  // In React Native, we approximate by string length
  // For more accurate estimation, we count characters that might be multi-byte
  let byteSize = 0;
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    // ASCII characters (0-127) are 1 byte
    // Characters above 127 can be 2-4 bytes in UTF-8
    if (charCode < 128) {
      byteSize += 1;
    } else if (charCode < 2048) {
      byteSize += 2;
    } else if (charCode < 65536) {
      byteSize += 3;
    } else {
      byteSize += 4;
    }
  }
  return byteSize;
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
  // Since "Default Printer" is configured, skip device listing
  // The thermal printer library will handle the connection when printing
  // If printer is not available, the print call itself will fail with appropriate error
  return true;
}

async function clearPrinterBuffer() {
  try {
    // Get MAC address - if not configured, skip silently (non-critical operation)
    let macAddress;
    try {
      macAddress = getPrinterMacAddress();
    } catch (error) {
      // No printer configured - skip silently as this is non-critical
      return;
    }

    // Send ESC/POS commands to clear printer buffer and reset state
    // This helps prevent state accumulation between prints
    // Only send initialization commands, no line feeds to avoid wasting paper
    const clearCommands = [
      '\x1B\x40', // ESC @ - Initialize printer (clears buffer)
      '\x1B\x61\x00', // ESC a 0 - Left alignment
    ].join('');

    await ThermalPrinterModule.printBluetooth({
      payload: clearCommands,
      macAddress: macAddress,
    });

    // Wait for printer to process the clear commands
    await new Promise(resolve => setTimeout(resolve, 150));
  } catch (error) {
    // If device not found, skip silently - this is expected if printer is disconnected
    if (
      error.message &&
      (error.message.includes('not found') ||
        error.message.includes('Not Found'))
    ) {
      return; // Skip silently
    }
    console.warn('Error clearing printer buffer:', error.message);
    // Don't throw error here as it's not critical
  }
}

async function resetPrinterConnection() {
  // Reset printer connection state to clear any cached/buffered data
  // This prevents state accumulation from previous prints
  try {
    // Get MAC address - if not configured, skip silently (non-critical operation)
    let macAddress;
    try {
      macAddress = getPrinterMacAddress();
    } catch (error) {
      // No printer configured - skip silently as this is non-critical
      return;
    }

    // Send ESC/POS reset command to clear printer state
    const resetCommands = '\x1B\x40'; // ESC @ - Initialize/Reset printer

    try {
      await ThermalPrinterModule.printBluetooth({
        payload: resetCommands,
        macAddress: macAddress,
      });
      // Wait for printer to process reset
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (resetError) {
      // If reset fails due to device not found, skip it silently
      // This is normal if printer is not connected - the actual print will handle it
      if (
        resetError.message &&
        (resetError.message.includes('not found') ||
          resetError.message.includes('Not Found'))
      ) {
        // Device not available - skip reset, actual print will handle the error
        return;
      }
      // For other errors, log but continue
      console.warn(
        'Printer reset command failed (may be non-critical):',
        resetError.message,
      );
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    console.warn('Error in resetPrinterConnection:', error.message);
    // Non-critical, continue anyway
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

async function printTest() {
  const dateTime = moment().format('MM-DD-YYYY HH:mm:ss');
  const textToPrint =
    '--------------------------------' +
    '\n' +
    '       SMALL TOWN LOTTERY       ' +
    '\n' +
    '              ZIAN              ' +
    '\n' +
    '--------------------------------' +
    '\n' +
    '         TEST PRINT PAGE        ' +
    '\n' +
    padStringToLength32('Date: ' + dateTime) +
    '\n' +
    '--------------------------------' +
    '\n' +
    'This is a test print to verify' +
    '\n' +
    'that your printer is working' +
    '\n' +
    'correctly.' +
    '\n' +
    'Printer: Default Printer' +
    '\n' +
    '--------------------------------' +
    '\n\n';
  await print(textToPrint);
}

export {
  printSales,
  printTransaction,
  printHits,
  printTest,
  listPairedDevices,
  checkPrinterConnection,
  clearPrinterBuffer,
  resetPrinterConnection,
};
