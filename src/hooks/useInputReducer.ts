/**
 * useInputReducer Hook
 *
 * Consolidates input state management for the TransacScreen.
 * Replaces three separate useState hooks with a single useReducer
 * for better performance and cleaner state transitions.
 *
 * IMPORTANT: Tracks lastAction to prevent auto-advance on backspace/manual focus
 */

import {useReducer, useCallback, useMemo, useRef} from 'react';

// ============================================================================
// Types
// ============================================================================

export type FocusedField = 'betNumber' | 'targetAmount' | 'rambolAmount';

/**
 * Last action type - used to determine if auto-advance should trigger
 * - 'forward': User added a digit (should auto-advance when complete)
 * - 'backward': User deleted or navigated back (should NOT auto-advance)
 * - 'manual': User manually clicked field (should NOT auto-advance)
 * - 'reset': Fields were reset (should NOT auto-advance)
 */
export type LastActionType = 'forward' | 'backward' | 'manual' | 'reset';

export interface InputState {
  betNumber: string;
  targetAmount: string;
  rambolAmount: string;
  focusedField: FocusedField;
  lastAction: LastActionType;
}

export type InputAction =
  | {type: 'SET_VALUE'; field: Exclude<keyof InputState, 'focusedField' | 'lastAction'>; value: string; actionType?: LastActionType}
  | {type: 'APPEND_VALUE'; field: Exclude<keyof InputState, 'focusedField' | 'lastAction'>; value: string}
  | {type: 'BACKSPACE'; field: Exclude<keyof InputState, 'focusedField' | 'lastAction'>}
  | {type: 'SET_FOCUS'; field: FocusedField; actionType?: LastActionType}
  | {type: 'CLEAR_FIELD'; field: Exclude<keyof InputState, 'focusedField' | 'lastAction'>}
  | {type: 'CLEAR_ALL_FIELDS'}
  | {type: 'RESET'}
  | {type: 'SET_FOCUS_AND_VALUE'; field: FocusedField; value?: string; actionType?: LastActionType}
  | {type: 'BATCH_UPDATE'; updates: Partial<InputState>};

// ============================================================================
// Initial State
// ============================================================================

const initialState: InputState = {
  betNumber: '',
  targetAmount: '',
  rambolAmount: '',
  focusedField: 'betNumber',
  lastAction: 'reset',
};

// ============================================================================
// Reducer
// ============================================================================

function inputReducer(state: InputState, action: InputAction): InputState {
  switch (action.type) {
    case 'SET_VALUE':
      return {
        ...state,
        [action.field]: action.value,
        lastAction: action.actionType || 'forward',
      };

    case 'APPEND_VALUE': {
      const currentValue = state[action.field];
      // Limit bet number to 3 digits, amounts to 3 digits
      const maxLength = action.field === 'betNumber' ? 3 : 3;
      if (currentValue.length >= maxLength) {
        return state;
      }
      return {
        ...state,
        [action.field]: currentValue + action.value,
        lastAction: 'forward', // Adding digit is forward action
      };
    }

    case 'BACKSPACE': {
      const currentValue = state[action.field];
      if (currentValue.length === 0) {
        return state;
      }
      return {
        ...state,
        [action.field]: currentValue.slice(0, -1),
        lastAction: 'backward', // Backspace is backward action
      };
    }

    case 'SET_FOCUS':
      return {
        ...state,
        focusedField: action.field,
        lastAction: action.actionType || 'manual', // Manual focus by default
      };

    case 'CLEAR_FIELD':
      return {
        ...state,
        [action.field]: '',
        lastAction: 'backward', // Clearing is backward action
      };

    case 'CLEAR_ALL_FIELDS':
      return {
        ...state,
        betNumber: '',
        targetAmount: '',
        rambolAmount: '',
        lastAction: 'backward',
      };

    case 'RESET':
      return initialState;

    case 'SET_FOCUS_AND_VALUE':
      return {
        ...state,
        focusedField: action.field,
        ...(action.value !== undefined && {[action.field]: action.value}),
        lastAction: action.actionType || 'manual',
      };

    case 'BATCH_UPDATE':
      return {
        ...state,
        ...action.updates,
        lastAction: action.updates.lastAction || 'reset',
      };

    default:
      return state;
  }
}

// ============================================================================
// Hook
// ============================================================================

export interface UseInputReducerReturn {
  // State
  state: InputState;
  betNumber: string;
  targetAmount: string;
  rambolAmount: string;
  focusedField: FocusedField;
  lastAction: LastActionType;

  // Computed
  isBetNumberFocused: boolean;
  isTargetAmountFocused: boolean;
  isRambolAmountFocused: boolean;
  isBetNumberComplete: boolean;
  isTargetAmountComplete: boolean;
  isRambolAmountComplete: boolean;
  targetAmountNum: number;
  rambolAmountNum: number;
  
  // Computed - for auto-advance logic
  shouldAutoAdvanceFromBetNumber: boolean;
  shouldAutoAdvanceFromTargetAmount: boolean;

  // Actions
  dispatch: React.Dispatch<InputAction>;
  setValue: (field: Exclude<keyof InputState, 'focusedField' | 'lastAction'>, value: string, actionType?: LastActionType) => void;
  appendValue: (value: string) => void;
  backspace: () => void;
  clearCurrentField: () => void;
  clearAllFields: () => void;
  setFocus: (field: FocusedField, actionType?: LastActionType) => void;
  reset: () => void;
  resetAfterBet: () => void;
  
  // For auto-advance - mark that we've handled the auto-advance
  markAutoAdvanceHandled: () => void;
}

export function useInputReducer(): UseInputReducerReturn {
  const [state, dispatch] = useReducer(inputReducer, initialState);
  
  // Track if we've already handled an auto-advance for current input
  const autoAdvanceHandledRef = useRef(false);

  // Computed values
  const isBetNumberFocused = state.focusedField === 'betNumber';
  const isTargetAmountFocused = state.focusedField === 'targetAmount';
  const isRambolAmountFocused = state.focusedField === 'rambolAmount';
  const isBetNumberComplete = state.betNumber.length === 3;
  const isTargetAmountComplete = state.targetAmount.length === 3;
  const isRambolAmountComplete = state.rambolAmount.length === 3;

  const targetAmountNum = useMemo(() => {
    const num = parseInt(state.targetAmount, 10);
    return isNaN(num) ? 0 : num;
  }, [state.targetAmount]);

  const rambolAmountNum = useMemo(() => {
    const num = parseInt(state.rambolAmount, 10);
    return isNaN(num) ? 0 : num;
  }, [state.rambolAmount]);

  // Should auto-advance only when:
  // 1. Field is complete (3 digits)
  // 2. Field is focused
  // 3. Last action was 'forward' (user added a digit, not backspace/manual focus)
  const shouldAutoAdvanceFromBetNumber = 
    isBetNumberComplete && 
    isBetNumberFocused && 
    state.lastAction === 'forward';

  const shouldAutoAdvanceFromTargetAmount = 
    isTargetAmountComplete && 
    isTargetAmountFocused && 
    state.lastAction === 'forward';

  // Actions
  const setValue = useCallback(
    (field: Exclude<keyof InputState, 'focusedField' | 'lastAction'>, value: string, actionType?: LastActionType) => {
      dispatch({type: 'SET_VALUE', field, value, actionType});
    },
    [],
  );

  const appendValue = useCallback(
    (value: string) => {
      dispatch({type: 'APPEND_VALUE', field: state.focusedField as Exclude<keyof InputState, 'focusedField' | 'lastAction'>, value});
    },
    [state.focusedField],
  );

  const backspace = useCallback(() => {
    dispatch({type: 'BACKSPACE', field: state.focusedField as Exclude<keyof InputState, 'focusedField' | 'lastAction'>});
  }, [state.focusedField]);

  const clearCurrentField = useCallback(() => {
    dispatch({type: 'CLEAR_FIELD', field: state.focusedField as Exclude<keyof InputState, 'focusedField' | 'lastAction'>});
  }, [state.focusedField]);

  const clearAllFields = useCallback(() => {
    dispatch({type: 'CLEAR_ALL_FIELDS'});
  }, []);

  const setFocus = useCallback((field: FocusedField, actionType?: LastActionType) => {
    dispatch({type: 'SET_FOCUS', field, actionType});
  }, []);

  const reset = useCallback(() => {
    dispatch({type: 'RESET'});
  }, []);

  const resetAfterBet = useCallback(() => {
    dispatch({
      type: 'BATCH_UPDATE',
      updates: {
        betNumber: '',
        targetAmount: '',
        rambolAmount: '',
        focusedField: 'betNumber',
        lastAction: 'reset',
      },
    });
  }, []);

  const markAutoAdvanceHandled = useCallback(() => {
    // After auto-advance, set lastAction to 'manual' to prevent re-triggering
    dispatch({type: 'SET_FOCUS', field: state.focusedField, actionType: 'manual'});
  }, [state.focusedField]);

  return {
    // State
    state,
    betNumber: state.betNumber,
    targetAmount: state.targetAmount,
    rambolAmount: state.rambolAmount,
    focusedField: state.focusedField,
    lastAction: state.lastAction,

    // Computed
    isBetNumberFocused,
    isTargetAmountFocused,
    isRambolAmountFocused,
    isBetNumberComplete,
    isTargetAmountComplete,
    isRambolAmountComplete,
    targetAmountNum,
    rambolAmountNum,
    shouldAutoAdvanceFromBetNumber,
    shouldAutoAdvanceFromTargetAmount,

    // Actions
    dispatch,
    setValue,
    appendValue,
    backspace,
    clearCurrentField,
    clearAllFields,
    setFocus,
    reset,
    resetAfterBet,
    markAutoAdvanceHandled,
  };
}

export default useInputReducer;
