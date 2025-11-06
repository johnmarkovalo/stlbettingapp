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
  const total = `TOTAL SALES:\t${totalAmount}.00`;

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

    await NyxPrinterModule.printText('--------------------------------', {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText(infoHeader, {align: PrintAlign.CENTER});
    await NyxPrinterModule.printText('Date:\t' + dateTime, {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText(user.agent_name, {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('--------------------------------', {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText(total, {
      textSize: 28,
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('', {});
    await NyxPrinterModule.printText('____________________________', {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText("Teller's Signature", {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('', {});

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

async function printHits(betDate, betTime, betType, totalAmount, user) {
  const infoHeader = `${moment(betDate).format('MM-DD-YYYY')} | ${
    betTime == 1 ? '1st' : betTime == 2 ? '2nd' : '3rd'
  } Draw | ${betType}`;
  const dateTime = moment().format('MM-DD-YYYY HH:mm:ss');
  const totalTarget = `TARGET:\t${totalAmount.totalTarget}.00`;
  const totalRambol = `RAMBOL:\t${totalAmount.totalRambol}.00`;

  const weights = [1, 1];
  const styles = [{align: PrintAlign.CENTER}, {align: PrintAlign.CENTER}];

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

    await NyxPrinterModule.printText('--------------------------------', {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText(infoHeader, {align: PrintAlign.CENTER});
    await NyxPrinterModule.printText('Date:\t' + dateTime, {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText(user.agent_name, {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('--------------------------------', {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printTableText([totalTarget, totalRambol], weights, [
      {textSize: 28, align: PrintAlign.CENTER},
      {textSize: 28, align: PrintAlign.CENTER},
    ]);
    await NyxPrinterModule.printText('', {});
    await NyxPrinterModule.printText('____________________________', {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText("Teller's Signature", {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('', {});

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

async function printTransaction(transaction, betType, bets, user) {
  const infoHeader = `${moment(transaction.betdate).format('MM-DD-YYYY')} | ${
    transaction.bettime == 1 ? '1st' : transaction.bettime == 2 ? '2nd' : '3rd'
  } Draw | ${betType.name.replace(/\s/g, '')}`;
  const dateTime = moment().format('MM-DD-YYYY HH:mm:ss');
  const ticket = `${transaction.ticketcode}`;
  const total = `TOTAL:\t${transaction.total}.00`;

  const weights = [1, 1, 1];
  const styles = [
    {align: PrintAlign.CENTER},
    {align: PrintAlign.CENTER},
    {align: PrintAlign.CENTER},
  ];

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

    await NyxPrinterModule.printTableText(
      ['------------------', '------------------', '-----------------'],
      weights,
      styles,
    );
    await NyxPrinterModule.printText('       SMALL TOWN LOTTERY       ', {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('              ZIAN              ', {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printTableText(
      ['------------------', '------------------', '-----------------'],
      weights,
      styles,
    );
    await NyxPrinterModule.printText(infoHeader, {align: PrintAlign.CENTER});
    await NyxPrinterModule.printText('Printed:\t' + dateTime, {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText(ticket, {
      textSize: 28,
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('Agent:\t' + user.agent_series, {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText(user.agent_name, {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('', {});
    await NyxPrinterModule.printText('1PHP T WINS ' + betType.wintar, {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('1PHP R WINS ' + betType.winram, {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('1PHP Double R WINS ' + betType.winram2, {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('', {});
    await NyxPrinterModule.printTableText(
      ['------------------', '------------------', '-----------------'],
      weights,
      styles,
    );
    await NyxPrinterModule.printTableText(
      ['No.', 'Target', 'Rambol'],
      weights,
      styles,
    );
    await NyxPrinterModule.printTableText(
      ['------------------', '------------------', '-----------------'],
      weights,
      styles,
    );
    for (const bet of bets) {
      await NyxPrinterModule.printTableText(
        [
          bet.betNumber,
          bet.targetAmount.toString() + ' T',
          bet.rambolAmount.toString() + ' R',
        ],
        weights,
        styles,
      );
    }
    await NyxPrinterModule.printText('', {});
    await NyxPrinterModule.printText(total, {align: PrintAlign.CENTER});
    await NyxPrinterModule.printText('', {});
    await NyxPrinterModule.printText(' Valid for 1 month after', {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText(' betting, otherwise forfeited', {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText(' No Ticket, No Payout', {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('\n\n', {});
    await NyxPrinterModule.printText('____________________________', {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText(" Ticket Holder's Signature", {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('', {});

    await NyxPrinterModule.printQrCode(
      String(ticket),
      300,
      300,
      PrintAlign.CENTER,
    );

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

async function printTest() {
  const dateTime = moment().format('MM-DD-YYYY HH:mm:ss');

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

    await NyxPrinterModule.printText('--------------------------------', {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('       SMALL TOWN LOTTERY       ', {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('              ZIAN              ', {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('--------------------------------', {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('         TEST PRINT PAGE        ', {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('Date:\t' + dateTime, {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('--------------------------------', {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('This is a test print to verify', {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('that your printer is working', {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('correctly.', {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('Printer:\tNyx Built-in Printer', {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('--------------------------------', {
      align: PrintAlign.CENTER,
    });
    await NyxPrinterModule.printText('', {});

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
  resetPrinterConnection,
};
