import {userConstants} from '../constants';

const INIT_STATE = {
  loggedIn: false,
  user: null,
  token: null,
  loading: false,
  error: null,
};

export function auth(state = INIT_STATE, action) {
  switch (action.type) {
    case userConstants.LOGIN:
      return {
        ...state,
        loggedIn: true,
        user: action.user,
        token: action.token,
      };
    case userConstants.LOGOUT:
      return INIT_STATE;
    default:
      return state;
  }
}
