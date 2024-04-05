import {typesConstants} from '../constants';

export const typesActions = {
  update,
};

function update(types) {
  return {type: typesConstants.UPDATE, types};
}
