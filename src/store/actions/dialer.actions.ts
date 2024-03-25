import { dialerConstants } from "../constants";

export const dialerActions = {
  addNumber,
  removeNumber,
  clear,
  setVoiceMail,
};

function addNumber(digit) {
  return { type: dialerConstants.ADD_NUMBER, number: digit };
}

function removeNumber() {
  return { type: dialerConstants.REMOVE_NUMBER };
}

function clear() {
  return { type: dialerConstants.CLEAR_NUMBER };
}

function setVoiceMail(voicemail) {
  return { type: dialerConstants.SET_VOICEMAIL, voicemail };
}
