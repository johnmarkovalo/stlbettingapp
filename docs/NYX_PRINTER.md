# Nyx Printer React Native Module

This module provides full integration with the Nyx Printer Service for React Native Android applications. It replicates all functionality from the `nyx-printer-react-native` package.

## Features

- Print text with custom formatting
- Print barcodes and QR codes
- Print bitmaps (black & white or grayscale)
- Print table data
- Label printing support
- LCD display control
- Cash drawer control
- Scanner integration (camera and infrared)
- Printer status monitoring

## Installation

The module is already integrated into the BettingApp project. No additional installation steps are required.

## Usage

### Basic Import

```typescript
import NyxPrinter, {
  PrintAlign,
  PrinterStatus,
  BarcodeTextPosition,
  LcdOpt,
  BitmapType,
} from '../native/nyx-printer';
```

### Example: Print Test Receipt

```typescript
import NyxPrinter, { PrintAlign, PrinterStatus } from '../native/nyx-printer';

const printReceipt = async () => {
  try {
    // Check printer status
    const status = await NyxPrinter.getPrinterStatus();
    if (status !== PrinterStatus.SDK_OK) {
      console.error('Printer status error:', PrinterStatus.msg(status));
      return;
    }

    // Print header
    await NyxPrinter.printText("Receipt", { 
      textSize: 48, 
      align: PrintAlign.CENTER 
    });

    // Print order info
    await NyxPrinter.printText(`\nOrder Time: ${Date.now()}\n`, { 
      align: PrintAlign.CENTER 
    });

    // Print table
    const weights = [1, 1, 1, 1];
    const headers = ["ITEM", "QTY", "PRICE", "TOTAL"];
    const styles = [
      { align: PrintAlign.CENTER },
      { align: PrintAlign.CENTER },
      { align: PrintAlign.CENTER },
      { align: PrintAlign.CENTER }
    ];
    await NyxPrinter.printTableText(headers, weights, styles);

    // Print QR code
    await NyxPrinter.printQrCode(
      Date.now().toString(), 
      300, 
      300, 
      PrintAlign.CENTER
    );

    // Feed paper and cut
    await NyxPrinter.printEndAutoOut();
  } catch (error) {
    console.error('Print error:', error);
  }
};
```

### Example: Print Barcode

```typescript
import NyxPrinter, { PrintAlign, BarcodeTextPosition } from '../native/nyx-printer';

await NyxPrinter.printBarcode(
  "1234567890",
  300,
  150,
  BarcodeTextPosition.TEXT_BELOW,
  PrintAlign.CENTER
);
```

### Example: Print Bitmap

```typescript
import NyxPrinter, { PrintAlign, BitmapType } from '../native/nyx-printer';

const base64Image = 'data:image/png;base64,iVBORw0KGgo...';

await NyxPrinter.printBitmap(
  base64Image,
  BitmapType.BLACK_WHITE,
  PrintAlign.CENTER
);
```

### Example: LCD Display

```typescript
import NyxPrinter, { LcdOpt } from '../native/nyx-printer';

// Initialize and show bitmap on LCD
await NyxPrinter.configLcd(LcdOpt.INIT);
await NyxPrinter.showLcdBitmap(base64Image);

// Reset LCD
await NyxPrinter.configLcd(LcdOpt.RESET);
```

### Example: Scanner

```typescript
import { DeviceEventEmitter } from 'react-native';
import NyxPrinter from '../native/nyx-printer';

// Register scanner listener
DeviceEventEmitter.addListener('onScanResult', (res) => {
  console.log('Scan result:', res);
});

// Trigger camera scan
await NyxPrinter.scan({
  title: 'Scan Barcode',
  showAlbum: true,
  playSound: true,
  playVibrate: true,
});

// Trigger infrared scan
await NyxPrinter.qscScan();
```

### Example: Cash Drawer

```typescript
await NyxPrinter.openCashBox();
```

## API Reference

### Methods

#### Printer Information
- `getServiceVersion(): Promise<string>` - Get printer service version
- `getPrinterVersion(): Promise<string>` - Get printer version
- `getPrinterStatus(): Promise<number>` - Get current printer status

#### Text Printing
- `printText(text: string, textStyle: PrintextStyle): Promise<void>` - Print text
- `printText2(text: string, textStyle: PrintextStyle, textWidth: number, align: PrintAlign): Promise<void>` - Print text with width constraint

#### Table Printing
- `printTableText(texts: string[], weights: number[], styles: PrintextStyle[]): Promise<void>` - Print table row

#### Barcode & QR Code
- `printBarcode(data: string, width: number, height: number, textPosition: BarcodeTextPosition, align: PrintAlign): Promise<void>`
- `printQrCode(data: string, width: number, height: number, align: PrintAlign): Promise<void>`

#### Bitmap Printing
- `printBitmap(base64Data: string, type: BitmapType, align: PrintAlign): Promise<void>`
- `printRasterData(base64Data: string): Promise<void>`
- `printEscposData(base64Data: string): Promise<void>`

#### Paper Control
- `paperOut(px: number): Promise<void>` - Feed paper out
- `paperBack(px: number): Promise<void>` - Feed paper back
- `printEndAutoOut(): Promise<void>` - Auto feed and cut

#### Label Printing
- `labelLocate(labelHeight: number, labelGap: number): Promise<void>`
- `labelPrintEnd(): Promise<void>`
- `labelLocateAuto(): Promise<void>`
- `labelDetectAuto(): Promise<void>`
- `hasLabelLearning(): Promise<boolean>`
- `clearLabelLearning(): Promise<void>`

#### LCD Display
- `configLcd(opt: LcdOpt): Promise<void>`
- `showLcdBitmap(base64Data: string): Promise<void>`

#### Cash Drawer
- `openCashBox(): Promise<void>`

#### Scanner
- `scan(opt: ScannerOptions): Promise<void>` - Camera scanner
- `qscScan(): Promise<void>` - Infrared scanner

### Enums

#### PrintAlign
- `LEFT` (0)
- `CENTER` (1)
- `RIGHT` (2)

#### BarcodeTextPosition
- `NO_TEXT` (0)
- `TEXT_ABOVE` (1)
- `TEXT_BELOW` (2)
- `BOTH` (3)

#### BitmapType
- `BLACK_WHITE` (0)
- `GRAYSCALE` (1)

#### LcdOpt
- `INIT` (0)
- `WAKEUP` (1)
- `SLEEP` (2)
- `CLEAR` (3)
- `RESET` (4)

#### PrinterStatus
- `SDK_OK` (0)
- `PRN_COVER_OPEN` (-1201)
- `PRN_PARAM_ERR` (-1202)
- `PRN_NO_PAPER` (-1203)
- `PRN_OVERHEAT` (-1204)
- `PRN_UNKNOWN_ERR` (-1205)
- `PRN_PRINTING` (-1206)
- `PRN_NO_NFC` (-1207)
- `PRN_NFC_NO_PAPER` (-1208)
- `PRN_LOW_BATTERY` (-1209)

### Interfaces

#### PrintextStyle
```typescript
{
  textSize?: number;
  underline?: boolean;
  textScaleX?: number;
  textScaleY?: number;
  letterSpacing?: number;
  lineSpacing?: number;
  topPadding?: number;
  leftPadding?: number;
  align?: PrintAlign;
  font?: string;
}
```

#### ScannerOptions
```typescript
{
  title?: string;
  showAlbum?: boolean;
  playVibrate?: boolean;
  playSound?: boolean;
}
```

## Demo Component

A complete demo component is available at `src/components/PrinterDemo.tsx` that demonstrates all printer features.

## Native Module Structure

The native Android module is located at:
- Kotlin: `android/app/src/main/java/com/bettingapp/nyxprinter/`
- AIDL: `android/app/src/main/aidl/net/nyx/printerservice/print/`
- Java: `android/app/src/main/java/net/nyx/printerservice/print/`

## Requirements

- Android device with Nyx Printer Service installed
- Android API level 21+
- React Native 0.63+

## Notes

- The module automatically binds to the Nyx Printer Service on initialization
- Scanner results are emitted via `DeviceEventEmitter` with event name `onScanResult`
- Always check printer status before printing to ensure the printer is ready
- The printer service must be installed on the device for the module to work
