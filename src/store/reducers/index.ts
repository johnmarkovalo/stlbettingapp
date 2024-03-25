import { combineReducers } from "redux";

import { auth } from "./auth.reducer";
import { alert } from "./alert.reducer";
import { prov } from "./prov.reducer";

const rootReducer = combineReducers({
  auth,
  alert,
  prov,
});

export default (state, action) =>
  rootReducer(action.type === "USERS_LOGOUT" ? undefined : state, action);
