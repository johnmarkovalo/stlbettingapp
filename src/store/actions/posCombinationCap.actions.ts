import {posCombinationCapConstants} from '../constants';

export const posCombinationCapActions = {
  update,
  clear,
};

function update(amounts: Record<string, number>, lastUpdated?: string) {
  return {
    type: posCombinationCapConstants.UPDATE,
    amounts,
    lastUpdated,
  };
}

function clear() {
  return {type: posCombinationCapConstants.CLEAR};
}

