import {posCombinationCapConstants} from '../constants';

// Structure: { [betTypeId_draw_combination]: totalAmount }
// Example: { "2_1_123": 150, "2_1_321": 50 } (both 123 and 321 map to same for rambol)
const INIT_STATE: {
  amounts: Record<string, number>;
  lastUpdated: string | null;
} = {
  amounts: {},
  lastUpdated: null,
};

export function posCombinationCap(state = INIT_STATE, action) {
  switch (action.type) {
    case posCombinationCapConstants.UPDATE:
      return {
        ...state,
        amounts: action.amounts,
        lastUpdated: action.lastUpdated || new Date().toISOString(),
      };
    case posCombinationCapConstants.CLEAR:
      return INIT_STATE;
    default:
      return state;
  }
}

