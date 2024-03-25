import { dialerConstants } from "../constants";

const INIT_STATE = {
  destination: "",
  voicemail: null,
};

export function dialer(state = INIT_STATE, action) {
  switch (action.type) {
    case dialerConstants.ADD_NUMBER:
      return {
        ...state,
        destination: `${state.destination}${action.number}`,
      };
    case dialerConstants.REMOVE_NUMBER:
      return {
        ...state,
        destination: state.destination.slice(0, -1),
      };
    case dialerConstants.CLEAR_NUMBER:
      return {
        ...state,
        destination: "",
      };
    case dialerConstants.SET_VOICEMAIL:
      return {
        ...state,
        voicemail: action.voicemail,
      };
    default:
      return state;
  }
}
