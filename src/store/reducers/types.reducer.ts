import {typesConstants} from '../constants';
import moment from 'moment';

const INIT_STATE = {
  types: [],
  selectedDraw: 1,
  selectedDate: new Date(),
  selectedType: 2,
  loading: false,
  error: null,
};

export function types(state = INIT_STATE, action) {
  switch (action.type) {
    case typesConstants.UPDATE:
      return {
        ...state,
        types: action.types,
      };
    case typesConstants.UPDATE_SELECTED_DRAW:
      return {
        ...state,
        selectedDraw: action.selectedDraw,
      }
    case typesConstants.UPDATE_SELECTED_DATE:
      return {
        ...state,
        selectedDate: action.selectedDate,
      }
    case typesConstants.UPDATE_SELECTED_TYPE:
      return {
        ...state,
        selectedType: action.selectedType,
      }
    default:
      return state;
  }
}
