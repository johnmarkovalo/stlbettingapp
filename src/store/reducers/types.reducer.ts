import {typesConstants} from '../constants';

const INIT_STATE = {
  types: [],
  selectedDraw: 1,
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
    default:
      return state;
  }
}
