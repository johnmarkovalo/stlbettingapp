import { userConstants } from "../constants";

const INIT_STATE = {
  loggedIn: false,
  user: null,
  loading: false,
  error: null,
  iceServer: null,
};

export function auth(state = INIT_STATE, action) {
  switch (action.type) {
    case userConstants.INIT_REQUEST:
      return {
        ...state,
      };
    case userConstants.INIT_SUCCESS:
      return {
        ...state,
        loggedIn: true,
        user: action.user,
      };
    case userConstants.INIT_FAILURE:
      return {};
    case userConstants.LOGIN_REQUEST:
      return {
        loggingIn: true,
      };
    case userConstants.LOGIN_SUCCESS:
      return {
        ...state,
        loggedIn: true,
        user: action.user,
      };
    case userConstants.LOGIN_FAILURE:
      return {
        error: action.error,
      };
    case userConstants.UPDATE_REQUEST:
      return {
        ...state,
        loading: true,
      };
    case userConstants.UPDATE_SUCCESS:
      return {
        ...state,
        loading: false,
        // @ts-ignore
        user: Object.assign(state.user, action.user),
      };
    case userConstants.SET_ICE_SERVER:
      return {
        ...state,
        iceServer: action.iceServer,
      };
    case userConstants.UPDATE_FAILURE:
      return {
        error: action.error,
      };
    default:
      return state;
  }
}
