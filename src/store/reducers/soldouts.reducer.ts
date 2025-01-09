import {soldoutsConstants} from '../constants';
import moment from 'moment';

const INIT_STATE = {
  soldouts: [],
  loading: false,
  error: null,
};

export function soldouts(state = INIT_STATE, action) {
  switch (action.type) {
    case soldoutsConstants.UPDATE:
      return {
        ...state,
        soldouts: action.soldouts,
      };
    default:
      return state;
  }
}
