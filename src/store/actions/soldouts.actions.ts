import {soldoutsConstants} from '../constants';

export const soldoutsActions = {
  update,
};

function update(soldouts) {
  return {type: soldoutsConstants.UPDATE, soldouts};
}
