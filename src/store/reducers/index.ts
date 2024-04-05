import {combineReducers} from 'redux';

import {auth} from './auth.reducer';

const rootReducer = combineReducers({
  auth,
});

export default (state, action) =>
  rootReducer(action.type === 'USERS_LOGOUT' ? undefined : state, action);
