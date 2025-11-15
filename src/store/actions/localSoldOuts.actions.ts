import {localSoldOutsConstants} from '../constants';

export const localSoldOutsActions = {
  updateServerSoldouts,
};

function updateServerSoldouts(soldouts) {
  return {
    type: localSoldOutsConstants.UPDATE_SERVER_SOLDOUTS,
    soldouts,
  };
}

