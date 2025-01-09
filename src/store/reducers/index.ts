import {combineReducers} from 'redux';

import {auth} from './auth.reducer';
import {types} from './types.reducer';
import {soldouts} from './soldouts.reducer';

const rootReducer = combineReducers({
  auth,
  types,
  soldouts,
});

export default (state, action) =>
  rootReducer(action.type === 'USERS_LOGOUT' ? undefined : state, action);
