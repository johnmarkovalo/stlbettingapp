import { alertConstants } from "../constants";

export const alertActions = {
  show,
  hide,
};

function show(data) {
  return { type: alertConstants.SHOW, data };
}

function hide() {
  return { type: alertConstants.HIDE };
}
