import {typesConstants} from '../constants';

export const typesActions = {
  update,
  updateSelectedDraw,
  updateSelectedDate,
  updateSelectedType,
};

function update(types) {
  return {type: typesConstants.UPDATE, types};
}

function updateSelectedDraw(selectedDraw) {
  return {type: typesConstants.UPDATE_SELECTED_DRAW, selectedDraw};
}

function updateSelectedDate(selectedDate) {
  return {type: typesConstants.UPDATE_SELECTED_DATE, selectedDate};
}

function updateSelectedType(selectedType) {
  return {type: typesConstants.UPDATE_SELECTED_TYPE, selectedType};
}
