import {combinationAmountsConstants} from '../constants';

export const combinationAmountsActions = {
  update,
  clear,
};

function update(amounts: Record<string, number>, lastUpdated?: string) {
  return {
    type: combinationAmountsConstants.UPDATE,
    amounts,
    lastUpdated,
  };
}

function clear() {
  return {type: combinationAmountsConstants.CLEAR};
}

