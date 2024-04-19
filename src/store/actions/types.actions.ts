import {typesConstants} from '../constants';

export const typesActions = {
  update,
  updateSelectedDraw,
};

function update(types) {
  return {type: typesConstants.UPDATE, types};
}

function updateSelectedDraw(selectedDraw) {
  return {type: typesConstants.UPDATE_SELECTED_DRAW, selectedDraw};
}
