/**
 * Transaction Selectors
 *
 * Memoized selectors for combination amounts and soldout data.
 * Uses useMemo pattern instead of reselect to avoid additional dependencies.
 */

import {useMemo} from 'react';
import {useSelector, shallowEqual} from 'react-redux';

// ============================================================================
// Types
// ============================================================================

interface RootState {
  auth: {
    user: any;
    token: string;
  };
  types: {
    types: any[];
    selectedType: number;
    selectedDraw: number;
  };
  localSoldOuts: {
    serverSoldouts: any[];
    loading: boolean;
    error: any;
  };
  combinationAmounts: {
    amounts: Record<string, number>;
    lastUpdated: string | null;
  };
  posCombinationCap: {
    amounts: Record<string, number>;
    lastUpdated: string | null;
  };
}

// ============================================================================
// Basic Selectors
// ============================================================================

/**
 * Select combination amounts from Redux
 */
export const selectCombinationAmounts = (state: RootState) =>
  state.combinationAmounts.amounts;

/**
 * Select combination amounts last updated timestamp
 */
export const selectCombinationAmountsLastUpdated = (state: RootState) =>
  state.combinationAmounts.lastUpdated;

/**
 * Select POS combination cap from Redux
 */
export const selectPOSCombinationCap = (state: RootState) =>
  state.posCombinationCap.amounts;

/**
 * Select POS combination cap last updated timestamp
 */
export const selectPOSCombinationCapLastUpdated = (state: RootState) =>
  state.posCombinationCap.lastUpdated;

/**
 * Select server soldouts from Redux
 */
export const selectServerSoldouts = (state: RootState) =>
  state.localSoldOuts.serverSoldouts;

/**
 * Select auth user
 */
export const selectUser = (state: RootState) => state.auth.user;

/**
 * Select auth token
 */
export const selectToken = (state: RootState) => state.auth.token;

// ============================================================================
// Hook-based Memoized Selectors
// ============================================================================

/**
 * Use combination amounts with shallow equality check
 */
export function useCombinationAmountsSelector() {
  return useSelector(selectCombinationAmounts, shallowEqual);
}

/**
 * Use POS combination cap with shallow equality check
 */
export function usePOSCombinationCapSelector() {
  return useSelector(selectPOSCombinationCap, shallowEqual);
}

/**
 * Use server soldouts with shallow equality check
 */
export function useServerSoldoutsSelector() {
  return useSelector(selectServerSoldouts, shallowEqual);
}

/**
 * Get amount for a specific key from combination amounts
 */
export function useCombinationAmountForKey(key: string): number {
  const amounts = useSelector(selectCombinationAmounts);
  return useMemo(() => amounts[key] || 0, [amounts, key]);
}

/**
 * Get amount for a specific key from POS combination cap
 */
export function usePOSCombinationCapForKey(key: string): number {
  const amounts = useSelector(selectPOSCombinationCap);
  return useMemo(() => amounts[key] || 0, [amounts, key]);
}

/**
 * Get filtered server soldouts for a specific draw/type/date
 */
export function useFilteredServerSoldouts(
  betTypeId: number,
  betDate: string,
  currentDraw: number | null,
) {
  const serverSoldouts = useSelector(selectServerSoldouts);

  return useMemo(() => {
    if (!serverSoldouts || !Array.isArray(serverSoldouts) || !currentDraw) {
      return [];
    }

    return serverSoldouts.filter(soldout => {
      if (!soldout || typeof soldout !== 'object') return false;

      const hasBetType = soldout.bettypeid !== undefined;
      const hasDate = soldout.betdate !== undefined;
      const hasDraw = soldout.bettime !== undefined;

      if (!hasBetType || !hasDate || !hasDraw) return false;

      return (
        soldout.bettypeid === betTypeId &&
        soldout.betdate === betDate &&
        soldout.bettime === currentDraw
      );
    });
  }, [serverSoldouts, betTypeId, betDate, currentDraw]);
}

/**
 * Get all transaction-related state in one selector to reduce re-renders
 */
export function useTransactionState() {
  const user = useSelector(selectUser);
  const token = useSelector(selectToken);
  const combinationAmounts = useSelector(selectCombinationAmounts, shallowEqual);
  const posCombinationCap = useSelector(selectPOSCombinationCap, shallowEqual);
  const serverSoldouts = useSelector(selectServerSoldouts, shallowEqual);

  return useMemo(
    () => ({
      user,
      token,
      combinationAmounts,
      posCombinationCap,
      serverSoldouts,
    }),
    [user, token, combinationAmounts, posCombinationCap, serverSoldouts],
  );
}

export default {
  selectCombinationAmounts,
  selectCombinationAmountsLastUpdated,
  selectPOSCombinationCap,
  selectPOSCombinationCapLastUpdated,
  selectServerSoldouts,
  selectUser,
  selectToken,
  useCombinationAmountsSelector,
  usePOSCombinationCapSelector,
  useServerSoldoutsSelector,
  useCombinationAmountForKey,
  usePOSCombinationCapForKey,
  useFilteredServerSoldouts,
  useTransactionState,
};
