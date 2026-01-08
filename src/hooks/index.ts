/**
 * Custom Hooks Index
 *
 * Central export point for all custom hooks used in the app.
 */

export {
  useInputReducer,
  type InputState,
  type InputAction,
  type FocusedField,
  type LastActionType,
  type UseInputReducerReturn,
} from './useInputReducer';

export {
  useSoldoutChecker,
  type SoldoutResult,
  type SoldoutReason,
  type UseSoldoutCheckerParams,
  type UseSoldoutCheckerReturn,
} from './useSoldoutChecker';

export {
  useCombinationAmounts,
  type UseCombinationAmountsParams,
  type UseCombinationAmountsReturn,
} from './useCombinationAmounts';
