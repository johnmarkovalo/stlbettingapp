import { provConstants } from "../constants";

const INIT_STATE = {
  loading: false,
  error: null,
  allAppData: null,
};

export function prov(state = INIT_STATE, action) {
  switch (action.type) {
    case provConstants.UPDATE_REQUEST:
      return {
        ...state,
        loading: true,
      };
    case provConstants.UPDATE_SUCCESS:
      return {
        ...state,
        loading: false,
        allAppData: action.allAppData,
      };
    case provConstants.UPDATE_FAILURE:
      return {
        ...state,
        error: action.error,
      };
    default:
      return state;
  }
}
