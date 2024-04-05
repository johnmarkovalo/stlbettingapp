import {typesConstants} from '../constants';

const INIT_STATE = {
  types: [],
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
    default:
      return state;
  }
}
