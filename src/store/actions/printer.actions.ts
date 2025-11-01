import {printerConstants} from '../constants';

export const printerActions = {
  updateSelectedPrinter,
  updatePrinterList,
};

function updateSelectedPrinter(selectedPrinter: any) {
  // selectedPrinter can be a string (for backward compat) or an object {name, macAddress}
  return {type: printerConstants.UPDATE_SELECTED_PRINTER, selectedPrinter};
}

function updatePrinterList(printerList: any[]) {
  return {type: printerConstants.UPDATE_PRINTER_LIST, printerList};
}

