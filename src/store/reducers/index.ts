import {combineReducers} from 'redux';

import {auth} from './auth.reducer';
import {types} from './types.reducer';
import {localSoldOuts} from './localSoldOuts.reducer';
import {printer} from './printer.reducer';
import {combinationAmounts} from './combinationAmounts.reducer';
import {posCombinationCap} from './posCombinationCap.reducer';

const rootReducer = combineReducers({
  auth,
  types,
  localSoldOuts,
  printer,
  combinationAmounts,
  posCombinationCap,
});

export default (state, action) =>
  rootReducer(action.type === 'USERS_LOGOUT' ? undefined : state, action);
