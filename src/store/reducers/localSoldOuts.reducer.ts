import {localSoldOutsConstants} from '../constants';

// LocalSoldOuts combines:
// 1. Server API soldouts
// 2. 15-minute combination limit (50)
// 3. POS combination limit (750)
const INIT_STATE = {
  serverSoldouts: [], // Soldouts from server API
  loading: false,
  error: null,
};

export function localSoldOuts(state = INIT_STATE, action) {
  switch (action.type) {
    case localSoldOutsConstants.UPDATE_SERVER_SOLDOUTS:
      return {
        ...state,
        serverSoldouts: action.soldouts,
      };
    default:
      return state;
  }
}

