import { alertConstants } from "../constants";

export function alert(state = {}, action) {
  switch (action.type) {
    case alertConstants.SHOW:
      return {
        show: true,
        data: action.data,
      };
    case alertConstants.HIDE:
      return {
        ...state,
        show: false,
        data: null,
      };
    default:
      return state;
  }
}
