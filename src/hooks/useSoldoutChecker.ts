/**
 * useSoldoutChecker Hook
 *
 * Centralized soldout checking logic with caching to prevent redundant checks.
 * Implements the hierarchical soldout check order:
 * 1. Server Soldouts (from API/Redux) - always checked
 * 2. POS Cap (750 per draw) - ALWAYS checked (includes DB transactions + current bets)
 * 3. 15-minute Limit (50) - within cutoff only
 *
 * IMPORTANT: The 750 limit includes:
 * - ALL existing transactions from database (synced + unsynced) via posCombinationCap from Redux
 *   - The getPOSCombinationAmounts query includes ALL transactions regardless of status
 *   - This prevents agents from exceeding quota across multiple offline transactions
 * - Current bets in the transaction being created (via currentBets prop)
 */

import {useCallback, useRef, useEffect, useMemo} from 'react';
import {Alert} from 'react-native';
import Bet from '../models/Bet';

// ============================================================================
// Types
// ============================================================================

export type SoldoutReason = 'server' | 'pos_cap' | '15min_limit' | null;

export interface SoldoutResult {
  isSoldOut: boolean;
  reason: SoldoutReason;
  remaining: number;
  message?: string;
}

export interface UseSoldoutCheckerParams {
  betTypeId: number;
  currentDraw: number | null;
  betDate: string;
  serverSoldouts: any[];
  combinationAmounts: Record<string, number>;
  posCombinationCap: Record<string, number>;
  currentBets: Bet[];
  isWithinCutoff: boolean;
  /** @deprecated No longer used - POS Cap (750) now applies regardless of online status */
  isOnline?: boolean;
}

export interface UseSoldoutCheckerReturn {
  /**
   * Check if a bet number is sold out.
   * @param betNumber - 3-digit bet number
   * @param targetAmt - Target amount to bet
   * @param rambolAmt - Rambol amount to bet
   * @param showAlert - Whether to show alert on soldout (default: true)
   * @returns SoldoutResult with details
   */
  checkSoldout: (
    betNumber: string,
    targetAmt: number,
    rambolAmt: number,
    showAlert?: boolean,
  ) => SoldoutResult;

  /**
   * Check only server soldouts (for quick validation)
   */
  checkServerSoldout: (betNumber: string, checkType: 'target' | 'rambol') => boolean;

  /**
   * Clear the cache (call when data changes)
   */
  clearCache: () => void;

  /**
   * Get the current limits for a bet number
   */
  getLimits: (betNumber: string) => {
    posCap: {current: number; limit: number; remaining: number};
    fifteenMin: {current: number; limit: number; remaining: number};
  };
}

// ============================================================================
// Constants
// ============================================================================

const POS_CAP_LIMIT = 750;
const FIFTEEN_MIN_LIMIT = 50;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sort number digits for rambol comparison
 * e.g., "321" -> "123"
 */
function sortNumber(number: string): string {
  return String(number).split('').sort().join('');
}

/**
 * Check if all digits are the same (triple)
 */
function checkIfTriple(num: string): boolean {
  const str = String(num);
  return str.split('').every(v => v === str[0]);
}

// ============================================================================
// Hook
// ============================================================================

export function useSoldoutChecker(params: UseSoldoutCheckerParams): UseSoldoutCheckerReturn {
  const {
    betTypeId,
    currentDraw,
    betDate,
    serverSoldouts,
    combinationAmounts,
    posCombinationCap,
    currentBets,
    isWithinCutoff,
    // isOnline is deprecated - POS Cap (750) now applies regardless of online status
  } = params;

  // Cache for soldout results to avoid redundant checks
  const checkCache = useRef<Map<string, SoldoutResult>>(new Map());

  // Calculate a hash of current bets for cache invalidation
  // This ensures cache is cleared when ANY bet changes, not just length
  const currentBetsHash = useMemo(() => {
    if (!currentBets || currentBets.length === 0) return '0';
    return currentBets
      .map(b => `${b.betNumber || ''}_${b.targetAmount || 0}_${b.rambolAmount || 0}`)
      .join('|');
  }, [currentBets]);

  // Clear cache when relevant data changes
  useEffect(() => {
    checkCache.current.clear();
  }, [serverSoldouts, combinationAmounts, posCombinationCap, currentBetsHash]);

  // Memoize filtered server soldouts for current draw
  const filteredServerSoldouts = useMemo(() => {
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

  /**
   * Check server soldouts only
   */
  const checkServerSoldout = useCallback(
    (betNumber: string, checkType: 'target' | 'rambol'): boolean => {
      if (filteredServerSoldouts.length === 0) return false;

      if (checkType === 'target') {
        return filteredServerSoldouts.some(
          soldout =>
            soldout &&
            soldout.combination === betNumber &&
            soldout.is_target === 1,
        );
      } else {
        const sortedNumber = sortNumber(betNumber);
        return filteredServerSoldouts.some(
          soldout =>
            soldout &&
            soldout.combination === sortedNumber &&
            soldout.is_target === 0,
        );
      }
    },
    [filteredServerSoldouts],
  );

  /**
   * Calculate current amounts from Redux + current bets
   */
  const calculateCurrentAmounts = useCallback(
    (
      betNumber: string,
      amountsStore: Record<string, number>,
    ): {targetTotal: number; rambolTotal: number} => {
      if (!currentDraw) {
        return {targetTotal: 0, rambolTotal: 0};
      }

      const key = `${betTypeId}_${currentDraw}`;
      const sortedNumber = sortNumber(betNumber);

      // Get amounts from Redux (DB transactions only)
      const targetKey = `${key}_target_${betNumber}`;
      const rambolKey = `${key}_rambol_${sortedNumber}`;

      let targetTotal = amountsStore[targetKey] || 0;
      let rambolTotal = amountsStore[rambolKey] || 0;

      // Add amounts from current bets (not yet in DB)
      if (currentBets && Array.isArray(currentBets)) {
        currentBets.forEach(bet => {
          if (!bet || !bet.betNumber) return;

          // Target: exact match only
          if (bet.betNumber === betNumber) {
            targetTotal += bet.targetAmount || 0;
          }

          // Rambol: all permutations share the same pool
          const betSortedNumber = sortNumber(bet.betNumber);
          if (betSortedNumber === sortedNumber) {
            rambolTotal += bet.rambolAmount || 0;
          }
        });
      }

      return {targetTotal, rambolTotal};
    },
    [betTypeId, currentDraw, currentBets],
  );

  /**
   * Get current limits for a bet number
   */
  const getLimits = useCallback(
    (betNumber: string) => {
      const posAmounts = calculateCurrentAmounts(betNumber, posCombinationCap);
      const fifteenMinAmounts = calculateCurrentAmounts(betNumber, combinationAmounts);

      const posTotal = posAmounts.targetTotal + posAmounts.rambolTotal;
      const fifteenMinTotal = fifteenMinAmounts.targetTotal + fifteenMinAmounts.rambolTotal;

      return {
        posCap: {
          current: posTotal,
          limit: POS_CAP_LIMIT,
          remaining: Math.max(0, POS_CAP_LIMIT - posTotal),
        },
        fifteenMin: {
          current: fifteenMinTotal,
          limit: FIFTEEN_MIN_LIMIT,
          remaining: Math.max(0, FIFTEEN_MIN_LIMIT - fifteenMinTotal),
        },
      };
    },
    [calculateCurrentAmounts, posCombinationCap, combinationAmounts],
  );

  /**
   * Main soldout check function with hierarchical checks
   */
  const checkSoldout = useCallback(
    (
      betNumber: string,
      targetAmt: number,
      rambolAmt: number,
      showAlert: boolean = true,
    ): SoldoutResult => {
      // Validate input
      if (!betNumber || betNumber.length !== 3) {
        return {isSoldOut: false, reason: null, remaining: 0};
      }

      if (!currentDraw) {
        return {isSoldOut: false, reason: null, remaining: 0};
      }

      // Check cache first - include currentBetsHash to ensure cache invalidates when bets change
      const cacheKey = `${betNumber}_${targetAmt}_${rambolAmt}_${showAlert}_${currentBetsHash}`;
      const cached = checkCache.current.get(cacheKey);
      if (cached) {
        return cached;
      }

      let result: SoldoutResult = {isSoldOut: false, reason: null, remaining: 0};

      // ========================================
      // 1. Check Server Soldouts (always check)
      // ========================================
      if (targetAmt > 0 && checkServerSoldout(betNumber, 'target')) {
        result = {
          isSoldOut: true,
          reason: 'server',
          remaining: 0,
          message: `Combination ${betNumber} is sold out`,
        };
        if (showAlert) {
          Alert.alert('Sold Out', result.message!);
        }
        checkCache.current.set(cacheKey, result);
        return result;
      }

      if (rambolAmt > 0 && !checkIfTriple(betNumber) && checkServerSoldout(betNumber, 'rambol')) {
        result = {
          isSoldOut: true,
          reason: 'server',
          remaining: 0,
          message: `Combination ${betNumber} is sold out`,
        };
        if (showAlert) {
          Alert.alert('Sold Out', result.message!);
        }
        checkCache.current.set(cacheKey, result);
        return result;
      }

      // ========================================
      // 2. Check POS Cap (750) - ALWAYS check (includes current bets)
      // This is a local safety limit that applies regardless of online/offline
      // ========================================
      if (targetAmt > 0 || rambolAmt > 0) {
        const posAmounts = calculateCurrentAmounts(betNumber, posCombinationCap);
        const posTotal = posAmounts.targetTotal + posAmounts.rambolTotal;
        const newPosTotal = posTotal + targetAmt + rambolAmt;

        if (newPosTotal > POS_CAP_LIMIT) {
          const remaining = Math.max(0, POS_CAP_LIMIT - posTotal);
          result = {
            isSoldOut: true,
            reason: 'pos_cap',
            remaining,
            message: buildLimitMessage(betNumber, remaining, targetAmt, rambolAmt),
          };
          if (showAlert) {
            Alert.alert('Sold Out', result.message!);
          }
          checkCache.current.set(cacheKey, result);
          return result;
        }
      }

      // ========================================
      // 3. Check 15-minute Limit (50) - Within cutoff only
      // ========================================
      if (isWithinCutoff && (targetAmt > 0 || rambolAmt > 0)) {
        const fifteenMinAmounts = calculateCurrentAmounts(betNumber, combinationAmounts);
        const fifteenMinTotal = fifteenMinAmounts.targetTotal + fifteenMinAmounts.rambolTotal;
        const newFifteenMinTotal = fifteenMinTotal + targetAmt + rambolAmt;

        if (newFifteenMinTotal > FIFTEEN_MIN_LIMIT) {
          const remaining = Math.max(0, FIFTEEN_MIN_LIMIT - fifteenMinTotal);
          result = {
            isSoldOut: true,
            reason: '15min_limit',
            remaining,
            message: buildLimitMessage(betNumber, remaining, targetAmt, rambolAmt),
          };
          if (showAlert) {
            Alert.alert('Sold Out', result.message!);
          }
          checkCache.current.set(cacheKey, result);
          return result;
        }
      }

      // Not sold out
      result = {isSoldOut: false, reason: null, remaining: 0};
      checkCache.current.set(cacheKey, result);
      return result;
    },
    [
      currentDraw,
      checkServerSoldout,
      isWithinCutoff,
      calculateCurrentAmounts,
      posCombinationCap,
      combinationAmounts,
      currentBetsHash,
    ],
  );

  /**
   * Clear the cache manually
   */
  const clearCache = useCallback(() => {
    checkCache.current.clear();
  }, []);

  return {
    checkSoldout,
    checkServerSoldout,
    clearCache,
    getLimits,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildLimitMessage(
  betNumber: string,
  remaining: number,
  targetAmt: number,
  rambolAmt: number,
): string {
  if (targetAmt > 0 && rambolAmt > 0) {
    return `Combination ${betNumber} is sold out. Maximum you can bet: Target ${remaining}, Rambol ${remaining} (Total: ${remaining})`;
  } else if (targetAmt > 0) {
    return `Combination ${betNumber} is sold out. Maximum you can bet for target: ${remaining}`;
  } else if (rambolAmt > 0) {
    return `Combination ${betNumber} is sold out. Maximum you can bet for rambol: ${remaining}`;
  }
  return `Combination ${betNumber} is sold out`;
}

export default useSoldoutChecker;
