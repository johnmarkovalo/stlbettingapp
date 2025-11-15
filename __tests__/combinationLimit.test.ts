/**
 * @format
 * Unit tests for combination limit logic (15 minutes before cutoff)
 */

import {sortNumber} from '../src/helper/functions';

// Mock the sortNumber function behavior
const mockSortNumber = (num: string): string => {
  return num.split('').sort().join('');
};

// Test helper function to simulate checkCombinationLimit logic
const checkCombinationLimit = (
  betNum: string,
  targetAmt: number,
  rambolAmt: number,
  combinationAmounts: Record<string, number>,
  betTypeId: number = 2,
  currentDraw: number = 1,
): {total: number; exceeds: boolean; breakdown: {target: number; rambol: number}} => {
  const key = `${betTypeId}_${currentDraw}`;
  let totalAmount = 0;

  // Get target amount for exact bet number
  const targetKey = `${key}_target_${betNum}`;
  const existingTarget = combinationAmounts[targetKey] || 0;
  const targetTotal = existingTarget + targetAmt;
  totalAmount += targetTotal;

  // Get rambol amount for sorted number (includes all permutations)
  const sortedNumber = mockSortNumber(betNum);
  const rambolKey = `${key}_rambol_${sortedNumber}`;
  const existingRambol = combinationAmounts[rambolKey] || 0;
  const rambolTotal = existingRambol + rambolAmt;
  totalAmount += rambolTotal;

  return {
    total: totalAmount,
    exceeds: totalAmount > 50,
    breakdown: {
      target: targetTotal,
      rambol: rambolTotal,
    },
  };
};

// Test helper to update combination amounts (simulating addBet)
const updateCombinationAmounts = (
  betNum: string,
  targetAmt: number,
  rambolAmt: number,
  combinationAmounts: Record<string, number>,
  betTypeId: number = 2,
  currentDraw: number = 1,
): Record<string, number> => {
  const updatedAmounts = {...combinationAmounts};
  const key = `${betTypeId}_${currentDraw}`;

  // Update target amount
  if (targetAmt > 0) {
    const targetKey = `${key}_target_${betNum}`;
    updatedAmounts[targetKey] = (updatedAmounts[targetKey] || 0) + targetAmt;
  }

  // Update rambol amount (use sorted number)
  if (rambolAmt > 0) {
    const sortedNumber = mockSortNumber(betNum);
    const rambolKey = `${key}_rambol_${sortedNumber}`;
    updatedAmounts[rambolKey] = (updatedAmounts[rambolKey] || 0) + rambolAmt;
  }

  return updatedAmounts;
};

describe('Combination Limit Logic (15 minutes before cutoff)', () => {
  const betTypeId = 2;
  const currentDraw = 1;

  beforeEach(() => {
    // Reset before each test
  });

  describe('Example 1: Target 123 = 10, Rambol 123 = 10', () => {
    it('should calculate total as 20 (10 target + 10 rambol)', () => {
      const combinationAmounts: Record<string, number> = {};
      const result = checkCombinationLimit('123', 10, 10, combinationAmounts, betTypeId, currentDraw);

      expect(result.total).toBe(20);
      expect(result.breakdown.target).toBe(10);
      expect(result.breakdown.rambol).toBe(10);
      expect(result.exceeds).toBe(false);
    });

    it('should store amounts correctly after adding bet', () => {
      let combinationAmounts: Record<string, number> = {};
      combinationAmounts = updateCombinationAmounts('123', 10, 10, combinationAmounts, betTypeId, currentDraw);

      expect(combinationAmounts[`${betTypeId}_${currentDraw}_target_123`]).toBe(10);
      expect(combinationAmounts[`${betTypeId}_${currentDraw}_rambol_123`]).toBe(10);
    });
  });

  describe('Example 2: Target 321 = 10, Rambol 321 = 10 (after Example 1)', () => {
    it('should calculate total as 30 (10 target 321 + 20 rambol from previous + new)', () => {
      // First, add the bet from Example 1
      let combinationAmounts: Record<string, number> = {};
      combinationAmounts = updateCombinationAmounts('123', 10, 10, combinationAmounts, betTypeId, currentDraw);

      // Now check limit for 321
      const result = checkCombinationLimit('321', 10, 10, combinationAmounts, betTypeId, currentDraw);

      expect(result.total).toBe(30);
      expect(result.breakdown.target).toBe(10); // New target 321 (separate from target 123)
      expect(result.breakdown.rambol).toBe(20); // Previous rambol 10 + new rambol 10
      expect(result.exceeds).toBe(false);
    });

    it('should store amounts correctly - target 321 separate, rambol shared', () => {
      let combinationAmounts: Record<string, number> = {};
      
      // Add bet 123
      combinationAmounts = updateCombinationAmounts('123', 10, 10, combinationAmounts, betTypeId, currentDraw);
      
      // Add bet 321
      combinationAmounts = updateCombinationAmounts('321', 10, 10, combinationAmounts, betTypeId, currentDraw);

      // Target amounts should be separate
      expect(combinationAmounts[`${betTypeId}_${currentDraw}_target_123`]).toBe(10);
      expect(combinationAmounts[`${betTypeId}_${currentDraw}_target_321`]).toBe(10);

      // Rambol amounts should be shared (both use sorted "123")
      expect(combinationAmounts[`${betTypeId}_${currentDraw}_rambol_123`]).toBe(20);
    });
  });

  describe('Rambol permutations grouping', () => {
    it('should group all permutations of 123 together for rambol', () => {
      let combinationAmounts: Record<string, number> = {};
      const permutations = ['123', '321', '213', '231', '312', '132'];

      // Add rambol amounts for different permutations
      permutations.forEach((perm, index) => {
        combinationAmounts = updateCombinationAmounts(perm, 0, 5, combinationAmounts, betTypeId, currentDraw);
      });

      // All should be stored under rambol_123 (sorted)
      expect(combinationAmounts[`${betTypeId}_${currentDraw}_rambol_123`]).toBe(30); // 6 * 5 = 30
    });

    it('should check limit correctly with multiple rambol permutations', () => {
      let combinationAmounts: Record<string, number> = {};
      
      // Add rambol for 123, 321, 213
      combinationAmounts = updateCombinationAmounts('123', 0, 10, combinationAmounts, betTypeId, currentDraw);
      combinationAmounts = updateCombinationAmounts('321', 0, 10, combinationAmounts, betTypeId, currentDraw);
      combinationAmounts = updateCombinationAmounts('213', 0, 10, combinationAmounts, betTypeId, currentDraw);

      // Now check limit for 231 (another permutation)
      const result = checkCombinationLimit('231', 0, 10, combinationAmounts, betTypeId, currentDraw);

      expect(result.breakdown.rambol).toBe(40); // 30 existing + 10 new
      expect(result.total).toBe(40);
    });
  });

  describe('Target amounts are separate', () => {
    it('should keep target 123 and target 321 separate', () => {
      let combinationAmounts: Record<string, number> = {};
      
      combinationAmounts = updateCombinationAmounts('123', 20, 0, combinationAmounts, betTypeId, currentDraw);
      combinationAmounts = updateCombinationAmounts('321', 15, 0, combinationAmounts, betTypeId, currentDraw);

      expect(combinationAmounts[`${betTypeId}_${currentDraw}_target_123`]).toBe(20);
      expect(combinationAmounts[`${betTypeId}_${currentDraw}_target_321`]).toBe(15);
    });

    it('should calculate limit correctly with separate target amounts', () => {
      let combinationAmounts: Record<string, number> = {};
      
      // Add target 123 = 20
      combinationAmounts = updateCombinationAmounts('123', 20, 0, combinationAmounts, betTypeId, currentDraw);
      
      // Check limit for target 321 = 15 (should not include target 123)
      const result = checkCombinationLimit('321', 15, 0, combinationAmounts, betTypeId, currentDraw);

      expect(result.breakdown.target).toBe(15); // Only target 321, not including target 123
      expect(result.total).toBe(15);
    });
  });

  describe('Combined target and rambol', () => {
    it('should sum target (exact) + rambol (all permutations) correctly', () => {
      let combinationAmounts: Record<string, number> = {};
      
      // Add target 123 = 10, rambol 123 = 10
      combinationAmounts = updateCombinationAmounts('123', 10, 10, combinationAmounts, betTypeId, currentDraw);
      
      // Add rambol 321 = 5 (adds to existing rambol)
      combinationAmounts = updateCombinationAmounts('321', 0, 5, combinationAmounts, betTypeId, currentDraw);

      // Check limit for target 321 = 10, rambol 321 = 5
      const result = checkCombinationLimit('321', 10, 5, combinationAmounts, betTypeId, currentDraw);

      expect(result.breakdown.target).toBe(10); // New target 321
      expect(result.breakdown.rambol).toBe(20); // Previous rambol (10 + 5) + new rambol 5
      expect(result.total).toBe(30);
    });
  });

  describe('Limit enforcement (50 limit)', () => {
    it('should allow total of 50', () => {
      const combinationAmounts: Record<string, number> = {};
      const result = checkCombinationLimit('123', 25, 25, combinationAmounts, betTypeId, currentDraw);

      expect(result.total).toBe(50);
      expect(result.exceeds).toBe(false);
    });

    it('should block total exceeding 50', () => {
      const combinationAmounts: Record<string, number> = {};
      const result = checkCombinationLimit('123', 25, 26, combinationAmounts, betTypeId, currentDraw);

      expect(result.total).toBe(51);
      expect(result.exceeds).toBe(true);
    });

    it('should block when existing amounts + new exceed 50', () => {
      let combinationAmounts: Record<string, number> = {};
      
      // Add target 123 = 30, rambol 123 = 15
      combinationAmounts = updateCombinationAmounts('123', 30, 15, combinationAmounts, betTypeId, currentDraw);
      
      // Try to add target 321 = 10, rambol 321 = 10
      const result = checkCombinationLimit('321', 10, 10, combinationAmounts, betTypeId, currentDraw);

      // Total = 10 (target 321) + 25 (rambol: 15 existing + 10 new) = 35, should pass
      expect(result.total).toBe(35);
      expect(result.exceeds).toBe(false);

      // But if we try to add more rambol
      combinationAmounts = updateCombinationAmounts('213', 0, 20, combinationAmounts, betTypeId, currentDraw);
      const result2 = checkCombinationLimit('231', 0, 20, combinationAmounts, betTypeId, currentDraw);
      // Total = 0 (no target) + 55 (rambol: 15 existing + 20 + 20 new) = 55, should exceed
      expect(result2.total).toBe(55);
      expect(result2.exceeds).toBe(true);

      // Test with smaller amounts that don't exceed
      let combinationAmounts2: Record<string, number> = {};
      combinationAmounts2 = updateCombinationAmounts('123', 30, 15, combinationAmounts2, betTypeId, currentDraw);
      
      // Try to add target 321 = 10, rambol 321 = 10
      const result3 = checkCombinationLimit('321', 10, 10, combinationAmounts2, betTypeId, currentDraw);
      // Total = 10 (target 321) + 25 (rambol: 15 existing + 10 new) = 35, should pass
      expect(result3.total).toBe(35);
      expect(result3.exceeds).toBe(false);

      // Exceed limit with new bet
      const result4 = checkCombinationLimit('213', 0, 20, combinationAmounts2, betTypeId, currentDraw);
      // Total = 0 (no target) + 35 (rambol: 15 existing + 20 new) = 35, should pass
      expect(result4.total).toBe(35);
      expect(result4.exceeds).toBe(false);
      
      // Add the bet to update amounts
      combinationAmounts2 = updateCombinationAmounts('213', 0, 20, combinationAmounts2, betTypeId, currentDraw);
      
      // Now exceed with another rambol bet
      const result5 = checkCombinationLimit('231', 0, 20, combinationAmounts2, betTypeId, currentDraw);
      // Total = 0 (no target) + 55 (rambol: 15 + 20 + 20 new) = 55, should exceed
      expect(result5.total).toBe(55);
      expect(result5.exceeds).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero amounts correctly', () => {
      const combinationAmounts: Record<string, number> = {};
      const result = checkCombinationLimit('123', 0, 0, combinationAmounts, betTypeId, currentDraw);

      expect(result.total).toBe(0);
      expect(result.exceeds).toBe(false);
    });

    it('should handle only target amount', () => {
      let combinationAmounts: Record<string, number> = {};
      combinationAmounts = updateCombinationAmounts('123', 20, 0, combinationAmounts, betTypeId, currentDraw);
      
      const result = checkCombinationLimit('123', 10, 0, combinationAmounts, betTypeId, currentDraw);

      expect(result.total).toBe(30);
      expect(result.breakdown.target).toBe(30);
      expect(result.breakdown.rambol).toBe(0);
    });

    it('should handle only rambol amount', () => {
      let combinationAmounts: Record<string, number> = {};
      combinationAmounts = updateCombinationAmounts('123', 0, 20, combinationAmounts, betTypeId, currentDraw);
      
      const result = checkCombinationLimit('321', 0, 10, combinationAmounts, betTypeId, currentDraw);

      expect(result.total).toBe(30);
      expect(result.breakdown.target).toBe(0);
      expect(result.breakdown.rambol).toBe(30); // 20 existing + 10 new
    });

    it('should handle different bet numbers correctly', () => {
      let combinationAmounts: Record<string, number> = {};
      
      // Add bet for 123
      combinationAmounts = updateCombinationAmounts('123', 10, 10, combinationAmounts, betTypeId, currentDraw);
      
      // Add bet for 456 (completely different)
      combinationAmounts = updateCombinationAmounts('456', 15, 15, combinationAmounts, betTypeId, currentDraw);

      // Check limit for 123 should not include 456
      const result123 = checkCombinationLimit('123', 5, 5, combinationAmounts, betTypeId, currentDraw);
      expect(result123.total).toBe(30); // 15 target + 15 rambol

      // Check limit for 456 should not include 123
      const result456 = checkCombinationLimit('456', 5, 5, combinationAmounts, betTypeId, currentDraw);
      expect(result456.total).toBe(40); // 20 target + 20 rambol
    });
  });

  describe('Real-world scenario simulation', () => {
    it('should simulate the exact user examples', () => {
      let combinationAmounts: Record<string, number> = {};

      // Example 1: Target 123 = 10, Rambol 123 = 10
      const check1 = checkCombinationLimit('123', 10, 10, combinationAmounts, betTypeId, currentDraw);
      expect(check1.total).toBe(20);
      expect(check1.exceeds).toBe(false);
      
      // Add the bet
      combinationAmounts = updateCombinationAmounts('123', 10, 10, combinationAmounts, betTypeId, currentDraw);

      // Example 2: Target 321 = 10, Rambol 321 = 10
      const check2 = checkCombinationLimit('321', 10, 10, combinationAmounts, betTypeId, currentDraw);
      expect(check2.total).toBe(30); // 10 (target 321) + 20 (rambol: 10 existing + 10 new)
      expect(check2.exceeds).toBe(false);
      
      // Verify final state
      expect(combinationAmounts[`${betTypeId}_${currentDraw}_target_123`]).toBe(10);
      expect(combinationAmounts[`${betTypeId}_${currentDraw}_target_321`]).toBeUndefined(); // Not added yet
      expect(combinationAmounts[`${betTypeId}_${currentDraw}_rambol_123`]).toBe(10);
    });
  });
});

