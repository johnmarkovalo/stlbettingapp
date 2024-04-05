import {combineReducers} from 'redux';

import {auth} from './auth.reducer';
import {types} from './types.reducer';

const rootReducer = combineReducers({
  auth,
  types,
});

export default (state, action) =>
  rootReducer(action.type === 'USERS_LOGOUT' ? undefined : state, action);
