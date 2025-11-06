import {printerConstants} from '../constants';

const INIT_STATE = {
  selectedPrinter: null, // Store printer object: {name: string, macAddress: string}
  printerMacAddress: null, // Store MAC address for quick access
  printerList: [],
  loading: false,
  error: null,
};

export function printer(state = INIT_STATE, action) {
  switch (action.type) {
    case printerConstants.UPDATE_SELECTED_PRINTER:
      return {
        ...state,
        selectedPrinter: action.selectedPrinter,
        printerMacAddress: action.selectedPrinter?.macAddress || null,
      };
    case printerConstants.UPDATE_PRINTER_LIST:
      return {
        ...state,
        printerList: action.printerList,
      };
    default:
      return state;
  }
}

