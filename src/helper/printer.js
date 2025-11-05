// POS SDK (Nyx) for built-in printer
let NyxPrinterModule, PrintAlign, PrinterStatus;
try {
  const nyxModule = require('../native/nyx-printer');
  NyxPrinterModule = nyxModule.default || nyxModule;
  PrintAlign = nyxModule.PrintAlign;
  PrinterStatus = nyxModule.PrinterStatus;
} catch (error) {
  console.warn('Nyx printer module not available:', error?.message || error);
  NyxPrinterModule = null;
}
import moment from 'moment';

// Global print queue to prevent multiple simultaneous print jobs
let isPrinting = false;

// Check if Nyx printer is available
async function checkNyxPrinter() {
  if (!NyxPrinterModule || !PrintAlign || !PrinterStatus) {
    throw new Error(
      'Nyx printer not available. Please ensure the printer service is installed on the device.',
    );
  }

  const status = await NyxPrinterModule.getPrinterStatus();
  if (status !== PrinterStatus.SDK_OK) {
    throw new Error(`Printer status error: ${PrinterStatus.msg(status)}`);
  }
}

async function printSales(betDate, betTime, betType, totalAmount, user) {
  const infoHeader = `${moment(betDate).format('MM-DD-YYYY')} | ${
    betTime == 1 ? '1st' : betTime == 2 ? '2nd' : '3rd'
  } Draw | ${betType}`;
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
  const infoHeader = `${moment(betDate).format('MM-DD-YYYY')} | ${
    betTime == 1 ? '1st' : betTime == 2 ? '2nd' : '3rd'
  } Draw | ${betType}`;
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
  const infoHeader = `${moment(transaction.betdate).format('MM-DD-YYYY')} | ${
    transaction.bettime == 1 ? '1st' : transaction.bettime == 2 ? '2nd' : '3rd'
  } Draw | ${betType.name.replace(/\s/g, '')}`;
  const dateTime = moment().format('MM-DD-YYYY HH:mm:ss');
  const ticket = `${transaction.ticketcode}`;
  const total = `TOTAL: <b>${transaction.total}.00</b>`;
  let betString = '';
  await bets.forEach(bet => {
    let target = bet.targetAmount.toString() + ' T';
    let rambol = bet.rambolAmount.toString() + ' R';
    betString += justifySpaceBetween(bet.betNumber, target, rambol);
  });

  // Print transaction text first (without QR code)
  const transactionText =
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
    '\n\n';

  // Print transaction text first
  await print(transactionText);

  // Wait a bit for the printer to finish processing the text before printing QR code
  await new Promise(resolve => setTimeout(resolve, 500));

  // Then print QR code
  await printQRCode(ticket);
}

// Helper function to print QR code using Nyx printer
async function printQRCode(ticket) {
  if (!NyxPrinterModule || !PrintAlign || !PrinterStatus) {
    console.warn('Nyx printer not available for QR code printing');
    return;
  }

  try {
    const status = await NyxPrinterModule.getPrinterStatus();
    if (status === PrinterStatus.SDK_OK) {
      await NyxPrinterModule.printQrCode(
        String(ticket),
        300,
        300,
        PrintAlign.CENTER,
      );
      await NyxPrinterModule.printText('\n', {});
      await NyxPrinterModule.printEndAutoOut();
      console.log('QR code printed via Nyx printer');
    } else {
      console.warn(`Nyx printer status error: ${PrinterStatus.msg(status)}`);
    }
  } catch (e) {
    console.warn('QR code print failed:', e?.message || e);
  }
}

// Parse and print text with HTML formatting support
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
    // Check printer availability
    await checkNyxPrinter();

    // Process text line by line
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Handle empty lines
      if (line.trim().length === 0) {
        await NyxPrinterModule.printText('\n', {});
        continue;
      }

      // Process line with HTML tags
      await processLine(line);
    }

    // Feed paper and cut
    await NyxPrinterModule.printEndAutoOut();
    console.log('Print completed successfully');
  } catch (error) {
    console.error('Error printing:', error);
    throw error;
  } finally {
    isPrinting = false;
  }
}

// Process a single line, handling HTML tags and formatting
async function processLine(line) {
  // Extract bold text segments
  const boldRegex = /<b>(.*?)<\/b>/g;
  const boldMatches = [];
  let match;
  while ((match = boldRegex.exec(line)) !== null) {
    boldMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[1],
    });
  }

  if (boldMatches.length > 0) {
    // Handle lines with bold text - preserve spacing
    let currentIndex = 0;
    let hasContent = false;

    for (const boldMatch of boldMatches) {
      // Print text before bold (preserve spacing)
      if (boldMatch.start > currentIndex) {
        const beforeText = line.substring(currentIndex, boldMatch.start);
        if (beforeText.trim().length > 0 || hasContent) {
          // Only print if there's actual content or we've already started printing
          await printFormattedLine(beforeText, line);
          hasContent = true;
        }
      }

      // Print bold text with larger size
      await NyxPrinterModule.printText(boldMatch.text, {
        textSize: 28,
        align: getTextAlign(line),
      });
      hasContent = true;

      currentIndex = boldMatch.end;
    }

    // Print remaining text after last bold
    if (currentIndex < line.length) {
      const afterText = line.substring(currentIndex);
      if (afterText.trim().length > 0 || hasContent) {
        await printFormattedLine(afterText, line);
      }
    }

    // Newline after the line
    await NyxPrinterModule.printText('\n', {});
  } else {
    // Regular line without bold - preserve original spacing for alignment
    await printFormattedLine(line, line);
  }
}

// Print a formatted line with proper alignment
async function printFormattedLine(text, originalLine) {
  const trimmed = text.trim();
  if (trimmed.length === 0 && text.length === 0) {
    await NyxPrinterModule.printText('\n', {});
    return;
  }

  const align = getTextAlign(originalLine);

  // Remove HTML tags from text before printing
  const cleanText = trimmed.replace(/<[^>]*>/g, '');

  if (cleanText.length === 0) {
    await NyxPrinterModule.printText('\n', {});
    return;
  }

  // For centered text (lines with padding), use printText2 with width constraint
  if (align === PrintAlign.CENTER) {
    // Use a reasonable width for 32-character lines (approximately 384px for 32 chars at 12px each)
    await NyxPrinterModule.printText2(
      cleanText,
      {textSize: 24},
      384,
      PrintAlign.CENTER,
    );
  } else {
    // For left or right aligned, use regular printText
    await NyxPrinterModule.printText(cleanText, {
      textSize: 24,
      align: align,
    });
  }
}

// Determine text alignment based on padding
function getTextAlign(line) {
  const trimmed = line.trim();
  if (trimmed.length === 0) return PrintAlign.LEFT;

  // Check padding on both sides
  const leadingSpaces = line.length - line.trimStart().length;
  const trailingSpaces = line.length - line.trimEnd().length;

  // If line has significant padding on both sides (centered), use center
  if (leadingSpaces >= 5 && trailingSpaces >= 5) {
    return PrintAlign.CENTER;
  }

  // If has more leading spaces than trailing, it's likely right-aligned
  if (leadingSpaces > trailingSpaces && leadingSpaces > 10) {
    return PrintAlign.RIGHT;
  }

  // Default to left alignment
  return PrintAlign.LEFT;
}

function padStringToLength32(inputString) {
  // Get the length of the input string
  var length = inputString.length;

  // Calculate how many spaces need to be added
  var spacesToAdd = 32 - length;

  // Check if the string is already longer than 32 characters
  if (spacesToAdd <= 0) {
    // If so, return the input string as it is
    return inputString + '\n';
  }

  // Add spaces at the start and end of the string
  var paddedString =
    ' '.repeat(Math.floor(spacesToAdd / 2)) +
    inputString +
    ' '.repeat(Math.ceil(spacesToAdd / 2));

  return paddedString + '\n';
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

  return result + '\n';
}

function justifySpaceBetween2(str1, str2) {
  // Calculate the length of each string
  var length1 = str1.length;
  var length2 = str2.length;

  var spacesBetween1 = 32 - length1 - length2;
  // Construct the resulting string with spaces added between the input strings
  var result = '<b>' + str1 + ' '.repeat(spacesBetween1) + str2 + '</b>';
  return result + '\n';
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
    '--------------------------------' +
    '\n' +
    'This is a test print to verify' +
    '\n' +
    'that your printer is working' +
    '\n' +
    'correctly.' +
    '\n' +
    'Printer: Nyx Built-in Printer' +
    '\n' +
    '--------------------------------' +
    '\n\n';
  await print(textToPrint);
}

// Placeholder functions for compatibility (no longer needed but kept for API compatibility)
async function listPairedDevices() {
  // Nyx printer is built-in, no Bluetooth pairing needed
  return [];
}

async function checkPrinterConnection() {
  // Nyx printer connection is automatic
  try {
    await checkNyxPrinter();
    return true;
  } catch (error) {
    return false;
  }
}

async function clearPrinterBuffer() {
  // Nyx printer handles buffer automatically
  // No action needed for built-in printer
  return;
}

async function resetPrinterConnection() {
  // Nyx printer connection is automatic
  // No action needed for built-in printer
  return;
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
