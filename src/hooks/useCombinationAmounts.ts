/**
 * useCombinationAmounts Hook
 *
 * Smart fetching for combination amounts with dirty flag pattern.
 * Reduces unnecessary database queries by tracking when data needs refresh.
 */

import {useCallback, useRef, useEffect} from 'react';
import {useDispatch} from 'react-redux';
import {
  getCombinationAmounts,
  getPOSCombinationAmounts,
} from '../database';
import {
  combinationAmountsActions,
  posCombinationCapActions,
} from '../store/actions';

// ============================================================================
// Types
// ============================================================================

export interface UseCombinationAmountsParams {
  betDate: string;
  currentDraw: number | null;
  betTypeId: number;
  isWithinCutoff: boolean;
}

export interface UseCombinationAmountsReturn {
  /**
   * Refresh combination amounts (15-minute limit)
   */
  refreshCombinationAmounts: () => Promise<void>;

  /**
   * Refresh POS combination cap (750 per draw)
   */
  refreshPOSCombinationAmounts: () => Promise<void>;

  /**
   * Mark both caches as needing refresh
   */
  markDirty: () => void;

  /**
   * Whether data is currently being fetched
   */
  isFetching: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const REFRESH_INTERVAL = 60000; // 60 seconds (reduced from 30s)
const FIFTEEN_MINUTE_WINDOW = 15;

// ============================================================================
// Hook
// ============================================================================

export function useCombinationAmounts(
  params: UseCombinationAmountsParams,
): UseCombinationAmountsReturn {
  const {betDate, currentDraw, betTypeId, isWithinCutoff} = params;
  const dispatch = useDispatch();

  // Dirty flags to track when data needs refresh
  const needsRefresh = useRef({
    combinationAmounts: true,
    posCombinationAmounts: true,
  });

  // Fetch state
  const isFetchingRef = useRef(false);
  const lastFetchTime = useRef({
    combinationAmounts: 0,
    posCombinationAmounts: 0,
  });

  /**
   * Refresh 15-minute combination amounts
   */
  const refreshCombinationAmounts = useCallback(async () => {
    // Skip if not within cutoff or no draw
    if (!isWithinCutoff || !currentDraw || !betTypeId) {
      dispatch(combinationAmountsActions.clear());
      return;
    }

    // Skip if not dirty and fetched recently (within 10 seconds)
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime.current.combinationAmounts;
    if (!needsRefresh.current.combinationAmounts && timeSinceLastFetch < 10000) {
      return;
    }

    try {
      isFetchingRef.current = true;
      const amounts = (await getCombinationAmounts(
        betDate,
        currentDraw,
        betTypeId,
        FIFTEEN_MINUTE_WINDOW,
      )) as Record<string, number>;

      dispatch(combinationAmountsActions.update(amounts));
      needsRefresh.current.combinationAmounts = false;
      lastFetchTime.current.combinationAmounts = now;
    } catch (error) {
      console.error('Error fetching combination amounts:', error);
    } finally {
      isFetchingRef.current = false;
    }
  }, [isWithinCutoff, currentDraw, betTypeId, betDate, dispatch]);

  /**
   * Refresh POS combination cap (entire draw)
   */
  const refreshPOSCombinationAmounts = useCallback(async () => {
    // Skip if no draw
    if (!currentDraw || !betTypeId) {
      dispatch(posCombinationCapActions.clear());
      return;
    }

    // Skip if not dirty and fetched recently (within 10 seconds)
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime.current.posCombinationAmounts;
    if (!needsRefresh.current.posCombinationAmounts && timeSinceLastFetch < 10000) {
      return;
    }

    try {
      isFetchingRef.current = true;
      const amounts = (await getPOSCombinationAmounts(
        betDate,
        currentDraw,
        betTypeId,
      )) as Record<string, number>;

      dispatch(posCombinationCapActions.update(amounts));
      needsRefresh.current.posCombinationAmounts = false;
      lastFetchTime.current.posCombinationAmounts = now;
    } catch (error) {
      console.error('Error fetching POS combination amounts:', error);
    } finally {
      isFetchingRef.current = false;
    }
  }, [currentDraw, betTypeId, betDate, dispatch]);

  /**
   * Mark both caches as needing refresh
   */
  const markDirty = useCallback(() => {
    needsRefresh.current.combinationAmounts = true;
    needsRefresh.current.posCombinationAmounts = true;
  }, []);

  // Initial fetch when screen mounts or draw changes
  useEffect(() => {
    if (currentDraw && betTypeId) {
      needsRefresh.current.combinationAmounts = true;
      needsRefresh.current.posCombinationAmounts = true;

      refreshCombinationAmounts();
      refreshPOSCombinationAmounts();
    }
  }, [currentDraw, betTypeId, refreshCombinationAmounts, refreshPOSCombinationAmounts]);

  // Background refresh interval (60s instead of 30s)
  useEffect(() => {
    if (!currentDraw) return;

    const intervalId = setInterval(() => {
      // Mark as dirty and refresh
      needsRefresh.current.combinationAmounts = true;
      needsRefresh.current.posCombinationAmounts = true;

      if (isWithinCutoff) {
        refreshCombinationAmounts();
      }
      refreshPOSCombinationAmounts();
    }, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [currentDraw, isWithinCutoff, refreshCombinationAmounts, refreshPOSCombinationAmounts]);

  // Clear amounts when not within cutoff
  useEffect(() => {
    if (!isWithinCutoff) {
      dispatch(combinationAmountsActions.clear());
    }
  }, [isWithinCutoff, dispatch]);

  // Clear amounts when no draw
  useEffect(() => {
    if (!currentDraw) {
      dispatch(combinationAmountsActions.clear());
      dispatch(posCombinationCapActions.clear());
    }
  }, [currentDraw, dispatch]);

  return {
    refreshCombinationAmounts,
    refreshPOSCombinationAmounts,
    markDirty,
    isFetching: isFetchingRef.current,
  };
}

export default useCombinationAmounts;
