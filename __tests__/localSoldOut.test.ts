/**
 * @format
 * Unit tests for LocalSoldOut logic (hierarchical checks)
 * 
 * Test Order:
 * 1. Server Soldout (from API) - if true, stop
 * 2. Local Soldout (POSCombinationCap - 750 per draw) - if true, stop
 * 3. 15-minute limit (50) - only if within 15 minutes of cutoff
 */

import {sortNumber} from '../src/helper/functions';

// Mock the sortNumber function behavior
const mockSortNumber = (num: string): string => {
  return num.split('').sort().join('');
};

// Test helper function to simulate checkLocalSoldOut logic
// Returns soldOut status, reason, and maximum bet amounts if applicable
const checkLocalSoldOut = (
  number: string,
  checkType: 'target' | 'rambol',
  targetAmt: number,
  rambolAmt: number,
  serverSoldouts: any[],
  posCombinationCap: Record<string, number>,
  combinationAmounts: Record<string, number>,
  isWithinCutoff: boolean,
  betTypeId: number = 2,
  currentDraw: number = 1,
): {
  soldOut: boolean;
  reason: string | null;
  maxTarget?: number;
  maxRambol?: number;
  remaining?: number;
} => {
  if (!number || number.length !== 3) {
    return {soldOut: false, reason: null};
  }

  // 1. Check Server Soldout (from API) - if true, stop immediately
  if (serverSoldouts.length > 0) {
    if (checkType === 'target') {
      const isSoldOut = serverSoldouts.some(
        soldout =>
          soldout.combination === number && soldout.is_target === 1,
      );
      if (isSoldOut) {
        return {soldOut: true, reason: 'server'};
      }
    } else if (checkType === 'rambol') {
      const sortedNumber = mockSortNumber(number);
      const isSoldOut = serverSoldouts.some(
        soldout =>
          soldout.combination === sortedNumber && soldout.is_target === 0,
      );
      if (isSoldOut) {
        return {soldOut: true, reason: 'server'};
      }
    }
  }

  // 2. Check Local Soldout (POSCombinationCap - 750 per draw) - if true, stop immediately
  if (targetAmt > 0 || rambolAmt > 0) {
    const key = `${betTypeId}_${currentDraw}`;
    const LIMIT = 750;

    const targetKey = `${key}_target_${number}`;
    const existingTarget = posCombinationCap[targetKey] || 0;

    const sortedNumber = mockSortNumber(number);
    const rambolKey = `${key}_rambol_${sortedNumber}`;
    const existingRambol = posCombinationCap[rambolKey] || 0;

    const currentTotal = existingTarget + existingRambol;
    const newTotal = currentTotal + targetAmt + rambolAmt;

    if (newTotal > LIMIT) {
      const remaining = LIMIT - currentTotal;
      return {
        soldOut: true,
        reason: 'local',
        maxTarget: remaining,
        maxRambol: remaining,
        remaining: remaining,
      };
    }
  }

  // 3. Check 15-minute limit (50) - only if within 15 minutes of cutoff
  if (isWithinCutoff && (targetAmt > 0 || rambolAmt > 0)) {
    const key = `${betTypeId}_${currentDraw}`;
    const LIMIT = 50;

    const targetKey = `${key}_target_${number}`;
    const existingTarget = combinationAmounts[targetKey] || 0;

    const sortedNumber = mockSortNumber(number);
    const rambolKey = `${key}_rambol_${sortedNumber}`;
    const existingRambol = combinationAmounts[rambolKey] || 0;

    const currentTotal = existingTarget + existingRambol;
    const newTotal = currentTotal + targetAmt + rambolAmt;

    if (newTotal > LIMIT) {
      const remaining = LIMIT - currentTotal;
      return {
        soldOut: true,
        reason: '15min',
        maxTarget: remaining,
        maxRambol: remaining,
        remaining: remaining,
      };
    }
  }

  return {soldOut: false, reason: null};
};

// Helper to update POS combination amounts
const updatePOSCombinationAmounts = (
  betNum: string,
  targetAmt: number,
  rambolAmt: number,
  posCombinationCap: Record<string, number>,
  betTypeId: number = 2,
  currentDraw: number = 1,
): Record<string, number> => {
  const updatedAmounts = {...posCombinationCap};
  const key = `${betTypeId}_${currentDraw}`;

  if (targetAmt > 0) {
    const targetKey = `${key}_target_${betNum}`;
    updatedAmounts[targetKey] = (updatedAmounts[targetKey] || 0) + targetAmt;
  }

  if (rambolAmt > 0) {
    const sortedNumber = mockSortNumber(betNum);
    const rambolKey = `${key}_rambol_${sortedNumber}`;
    updatedAmounts[rambolKey] = (updatedAmounts[rambolKey] || 0) + rambolAmt;
  }

  return updatedAmounts;
};

// Helper to update 15-minute combination amounts
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

  if (targetAmt > 0) {
    const targetKey = `${key}_target_${betNum}`;
    updatedAmounts[targetKey] = (updatedAmounts[targetKey] || 0) + targetAmt;
  }

  if (rambolAmt > 0) {
    const sortedNumber = mockSortNumber(betNum);
    const rambolKey = `${key}_rambol_${sortedNumber}`;
    updatedAmounts[rambolKey] = (updatedAmounts[rambolKey] || 0) + rambolAmt;
  }

  return updatedAmounts;
};

describe('LocalSoldOut - Hierarchical Checks', () => {
  const betTypeId = 2;
  const currentDraw = 1;

  describe('1. Server Soldout Check (First Priority)', () => {
    it('should stop at server soldout for target and not check further', () => {
      const serverSoldouts = [
        {combination: '123', is_target: 1},
      ];
      const posCombinationCap: Record<string, number> = {};
      const combinationAmounts: Record<string, number> = {};

      const result = checkLocalSoldOut(
        '123',
        'target',
        100,
        100,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(true);
      expect(result.reason).toBe('server');
    });

    it('should stop at server soldout for rambol and not check further', () => {
      const serverSoldouts = [
        {combination: '123', is_target: 0}, // rambol uses sorted number
      ];
      const posCombinationCap: Record<string, number> = {};
      const combinationAmounts: Record<string, number> = {};

      // 321 should be sold out because rambol uses sorted number (123)
      const result = checkLocalSoldOut(
        '321',
        'rambol',
        100,
        100,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(true);
      expect(result.reason).toBe('server');
    });

    it('should proceed to next check if server soldout is false', () => {
      const serverSoldouts: any[] = [];
      const posCombinationCap: Record<string, number> = {};
      const combinationAmounts: Record<string, number> = {};

      const result = checkLocalSoldOut(
        '123',
        'target',
        0,
        0,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(false);
      expect(result.reason).toBe(null);
    });

    it('should check target soldout separately from rambol soldout', () => {
      const serverSoldouts = [
        {combination: '123', is_target: 1}, // Only target is sold out
      ];
      const posCombinationCap: Record<string, number> = {};
      const combinationAmounts: Record<string, number> = {};

      // Target should be sold out
      const targetResult = checkLocalSoldOut(
        '123',
        'target',
        10,
        10,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );
      expect(targetResult.soldOut).toBe(true);
      expect(targetResult.reason).toBe('server');

      // Rambol should NOT be sold out (different is_target)
      const rambolResult = checkLocalSoldOut(
        '123',
        'rambol',
        10,
        10,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );
      expect(rambolResult.soldOut).toBe(false);
    });
  });

  describe('2. Local Soldout Check (POSCombinationCap - 750 limit)', () => {
    it('should stop at local soldout if total exceeds 750 and not check 15-min limit', () => {
      const serverSoldouts: any[] = [];
      let posCombinationCap: Record<string, number> = {};
      
      // Add existing amounts that total 700
      posCombinationCap = updatePOSCombinationAmounts('123', 400, 300, posCombinationCap, betTypeId, currentDraw);
      
      const combinationAmounts: Record<string, number> = {};

      // Try to add 100 more (would make total 800, exceeding 750)
      const result = checkLocalSoldOut(
        '123',
        'target',
        100,
        0,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true, // Even if within cutoff, should stop at local soldout
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(true);
      expect(result.reason).toBe('local');
    });

    it('should allow total of exactly 750', () => {
      const serverSoldouts: any[] = [];
      let posCombinationCap: Record<string, number> = {};
      
      // Add existing amounts that total 700
      posCombinationCap = updatePOSCombinationAmounts('123', 400, 300, posCombinationCap, betTypeId, currentDraw);
      
      const combinationAmounts: Record<string, number> = {};

      // Try to add 50 more (would make total 750, should pass)
      const result = checkLocalSoldOut(
        '123',
        'target',
        50,
        0,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(false);
    });

    it('should combine target and rambol amounts for local soldout check', () => {
      const serverSoldouts: any[] = [];
      let posCombinationCap: Record<string, number> = {};
      
      // Add existing: target 123 = 400, rambol 123 = 300 (total 700)
      posCombinationCap = updatePOSCombinationAmounts('123', 400, 300, posCombinationCap, betTypeId, currentDraw);
      
      const combinationAmounts: Record<string, number> = {};

      // Try to add target 123 = 30, rambol 321 = 30
      // Total would be: 400 + 30 (target) + 300 + 30 (rambol, same sorted) = 760
      const result = checkLocalSoldOut(
        '123',
        'target',
        30,
        30,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(true);
      expect(result.reason).toBe('local');
    });

    it('should not check local soldout if amounts are 0', () => {
      const serverSoldouts: any[] = [];
      const posCombinationCap: Record<string, number> = {};
      const combinationAmounts: Record<string, number> = {};

      // No amounts provided, should skip local soldout check
      const result = checkLocalSoldOut(
        '123',
        'target',
        0,
        0,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(false);
    });
  });

  describe('3. 15-minute Limit Check (50 limit)', () => {
    it('should check 15-minute limit only if within cutoff', () => {
      const serverSoldouts: any[] = [];
      const posCombinationCap: Record<string, number> = {};
      let combinationAmounts: Record<string, number> = {};
      
      // Add existing amounts that total 40
      combinationAmounts = updateCombinationAmounts('123', 20, 20, combinationAmounts, betTypeId, currentDraw);

      // Within cutoff, try to add 15 more (total 55, exceeds 50)
      const resultWithin = checkLocalSoldOut(
        '123',
        'target',
        15,
        0,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true, // Within cutoff
        betTypeId,
        currentDraw,
      );

      expect(resultWithin.soldOut).toBe(true);
      expect(resultWithin.reason).toBe('15min');

      // NOT within cutoff, same amounts should pass
      const resultOutside = checkLocalSoldOut(
        '123',
        'target',
        15,
        0,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        false, // NOT within cutoff
        betTypeId,
        currentDraw,
      );

      expect(resultOutside.soldOut).toBe(false);
    });

    it('should allow total of exactly 50 within cutoff', () => {
      const serverSoldouts: any[] = [];
      const posCombinationCap: Record<string, number> = {};
      let combinationAmounts: Record<string, number> = {};
      
      // Add existing amounts that total 40
      combinationAmounts = updateCombinationAmounts('123', 20, 20, combinationAmounts, betTypeId, currentDraw);

      // Try to add 10 more (total 50, should pass)
      const result = checkLocalSoldOut(
        '123',
        'target',
        10,
        0,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(false);
    });

    it('should not check 15-minute limit if amounts are 0', () => {
      const serverSoldouts: any[] = [];
      const posCombinationCap: Record<string, number> = {};
      const combinationAmounts: Record<string, number> = {};

      // No amounts, should skip 15-minute check even if within cutoff
      const result = checkLocalSoldOut(
        '123',
        'target',
        0,
        0,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(false);
    });
  });

  describe('Hierarchical Order - Server → Local → 15-min', () => {
    it('should stop at server soldout and not check local or 15-min', () => {
      const serverSoldouts = [
        {combination: '123', is_target: 1},
      ];
      let posCombinationCap: Record<string, number> = {};
      let combinationAmounts: Record<string, number> = {};
      
      // Set up amounts that would exceed both local (750) and 15-min (50) limits
      posCombinationCap = updatePOSCombinationAmounts('123', 400, 400, posCombinationCap, betTypeId, currentDraw);
      combinationAmounts = updateCombinationAmounts('123', 30, 30, combinationAmounts, betTypeId, currentDraw);

      // Should stop at server soldout, not check further
      const result = checkLocalSoldOut(
        '123',
        'target',
        100,
        100,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(true);
      expect(result.reason).toBe('server');
    });

    it('should stop at local soldout if server passes but local fails', () => {
      const serverSoldouts: any[] = []; // No server soldout
      let posCombinationCap: Record<string, number> = {};
      let combinationAmounts: Record<string, number> = {};
      
      // Set up amounts that would exceed local (750) limit
      posCombinationCap = updatePOSCombinationAmounts('123', 400, 400, posCombinationCap, betTypeId, currentDraw);
      // Set up amounts that would exceed 15-min (50) limit
      combinationAmounts = updateCombinationAmounts('123', 30, 30, combinationAmounts, betTypeId, currentDraw);

      // Should stop at local soldout, not check 15-min
      const result = checkLocalSoldOut(
        '123',
        'target',
        100,
        0,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(true);
      expect(result.reason).toBe('local');
    });

    it('should check 15-min limit only if server and local both pass', () => {
      const serverSoldouts: any[] = []; // No server soldout
      const posCombinationCap: Record<string, number> = {}; // No local soldout
      let combinationAmounts: Record<string, number> = {};
      
      // Set up amounts that would exceed 15-min (50) limit
      combinationAmounts = updateCombinationAmounts('123', 30, 30, combinationAmounts, betTypeId, currentDraw);

      // Should check 15-min limit and find it exceeds
      const result = checkLocalSoldOut(
        '123',
        'target',
        10,
        0,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(true);
      expect(result.reason).toBe('15min');
    });

    it('should pass all checks if none fail', () => {
      const serverSoldouts: any[] = [];
      const posCombinationCap: Record<string, number> = {};
      const combinationAmounts: Record<string, number> = {};

      const result = checkLocalSoldOut(
        '123',
        'target',
        10,
        10,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(false);
      expect(result.reason).toBe(null);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle scenario: Server soldout blocks everything', () => {
      const serverSoldouts = [
        {combination: '123', is_target: 1},
        {combination: '123', is_target: 0},
      ];
      const posCombinationCap: Record<string, number> = {};
      const combinationAmounts: Record<string, number> = {};

      // Both target and rambol should be blocked by server
      const targetResult = checkLocalSoldOut(
        '123',
        'target',
        100,
        100,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );
      expect(targetResult.soldOut).toBe(true);
      expect(targetResult.reason).toBe('server');

      const rambolResult = checkLocalSoldOut(
        '123',
        'rambol',
        100,
        100,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );
      expect(rambolResult.soldOut).toBe(true);
      expect(rambolResult.reason).toBe('server');
    });

    it('should handle scenario: Local soldout (750) blocks but server passes', () => {
      const serverSoldouts: any[] = [];
      let posCombinationCap: Record<string, number> = {};
      
      // Build up to 700
      posCombinationCap = updatePOSCombinationAmounts('123', 400, 300, posCombinationCap, betTypeId, currentDraw);
      
      const combinationAmounts: Record<string, number> = {};

      // Try to add 60 more (would exceed 750)
      const result = checkLocalSoldOut(
        '123',
        'target',
        60,
        0,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(true);
      expect(result.reason).toBe('local');
    });

    it('should handle scenario: 15-min limit (50) blocks but server and local pass', () => {
      const serverSoldouts: any[] = [];
      const posCombinationCap: Record<string, number> = {}; // No local soldout
      let combinationAmounts: Record<string, number> = {};
      
      // Build up to 40 in 15-min window
      combinationAmounts = updateCombinationAmounts('123', 20, 20, combinationAmounts, betTypeId, currentDraw);

      // Try to add 15 more (would exceed 50)
      const result = checkLocalSoldOut(
        '123',
        'target',
        15,
        0,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(true);
      expect(result.reason).toBe('15min');
    });

    it('should handle scenario: All checks pass', () => {
      const serverSoldouts: any[] = [];
      const posCombinationCap: Record<string, number> = {};
      const combinationAmounts: Record<string, number> = {};

      const result = checkLocalSoldOut(
        '123',
        'target',
        10,
        10,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(false);
      expect(result.reason).toBe(null);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty bet number', () => {
      const serverSoldouts: any[] = [];
      const posCombinationCap: Record<string, number> = {};
      const combinationAmounts: Record<string, number> = {};

      const result = checkLocalSoldOut(
        '',
        'target',
        10,
        10,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(false);
    });

    it('should handle incomplete bet number (less than 3 digits)', () => {
      const serverSoldouts: any[] = [];
      const posCombinationCap: Record<string, number> = {};
      const combinationAmounts: Record<string, number> = {};

      const result = checkLocalSoldOut(
        '12',
        'target',
        10,
        10,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(false);
    });

    it('should handle rambol permutations correctly for local soldout', () => {
      const serverSoldouts: any[] = [];
      let posCombinationCap: Record<string, number> = {};
      
      // Add rambol for 123 = 400
      posCombinationCap = updatePOSCombinationAmounts('123', 0, 400, posCombinationCap, betTypeId, currentDraw);
      
      const combinationAmounts: Record<string, number> = {};

      // Try to add rambol for 321 = 400 (should combine with 123's rambol)
      // Total rambol = 400 + 400 = 800, exceeds 750
      const result = checkLocalSoldOut(
        '321',
        'rambol',
        0,
        400,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(true);
      expect(result.reason).toBe('local');
    });

    it('should handle rambol permutations correctly for 15-min limit', () => {
      const serverSoldouts: any[] = [];
      const posCombinationCap: Record<string, number> = {};
      let combinationAmounts: Record<string, number> = {};
      
      // Add rambol for 123 = 30
      combinationAmounts = updateCombinationAmounts('123', 0, 30, combinationAmounts, betTypeId, currentDraw);

      // Try to add rambol for 321 = 25 (should combine with 123's rambol)
      // Total rambol = 30 + 25 = 55, exceeds 50
      const result = checkLocalSoldOut(
        '321',
        'rambol',
        0,
        25,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(true);
      expect(result.reason).toBe('15min');
    });

    it('should handle target amounts separately (123 vs 321) for local soldout', () => {
      const serverSoldouts: any[] = [];
      let posCombinationCap: Record<string, number> = {};
      
      // Add target 123 = 400
      posCombinationCap = updatePOSCombinationAmounts('123', 400, 0, posCombinationCap, betTypeId, currentDraw);
      
      const combinationAmounts: Record<string, number> = {};

      // Try to add target 321 = 400
      // Target 123 and target 321 are separate for local soldout check, so:
      // - target_123 = 400 (existing, but we're checking for 321, so this doesn't matter)
      // - target_321 = 0 (doesn't exist) + 400 (new) = 400
      // - rambol_321 = rambol_123 (sorted) = 0 (no rambol added)
      // Total = 400 + 0 = 400, which is < 750, so should pass local soldout
      // However, if within cutoff, 15-min limit will also be checked (400 > 50, so will fail)
      // Test with NOT within cutoff to show target amounts are separate for local soldout
      const result = checkLocalSoldOut(
        '321',
        'target',
        400,
        0,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        false, // NOT within cutoff, so 15-min limit won't be checked
        betTypeId,
        currentDraw,
      );

      // Should pass local soldout (400 < 750) since target 123 and 321 are separate
      expect(result.soldOut).toBe(false);
    });

    it('should handle target amounts separately but 15-min limit still applies', () => {
      const serverSoldouts: any[] = [];
      let posCombinationCap: Record<string, number> = {};
      
      // Add target 123 = 400
      posCombinationCap = updatePOSCombinationAmounts('123', 400, 0, posCombinationCap, betTypeId, currentDraw);
      
      const combinationAmounts: Record<string, number> = {};

      // Try to add target 321 = 400 within cutoff
      // Target 123 and 321 are separate, so local soldout passes (400 < 750)
      // But 15-min limit applies to the combination, so 400 > 50 will fail
      const result = checkLocalSoldOut(
        '321',
        'target',
        400,
        0,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true, // Within cutoff, so 15-min limit will be checked
        betTypeId,
        currentDraw,
      );

      // Should fail 15-min limit (400 > 50)
      expect(result.soldOut).toBe(true);
      expect(result.reason).toBe('15min');
    });
  });

  describe('Maximum Bet Amount Alerts', () => {
    it('should return maximum bet amount for local soldout when target exceeds limit', () => {
      const serverSoldouts: any[] = [];
      let posCombinationCap: Record<string, number> = {};
      
      // Existing: target 123 = 740, rambol 123 = 0 (total 740)
      posCombinationCap = updatePOSCombinationAmounts('123', 740, 0, posCombinationCap, betTypeId, currentDraw);
      
      const combinationAmounts: Record<string, number> = {};

      // Try to add target 123 = 20 (would make total 760, exceeds 750)
      // Remaining = 750 - 740 = 10
      const result = checkLocalSoldOut(
        '123',
        'target',
        20,
        0,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        false,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(true);
      expect(result.reason).toBe('local');
      expect(result.maxTarget).toBe(10);
      expect(result.remaining).toBe(10);
    });

    it('should return maximum bet amount for local soldout when rambol exceeds limit', () => {
      const serverSoldouts: any[] = [];
      let posCombinationCap: Record<string, number> = {};
      
      // Existing: target 123 = 0, rambol 123 = 740 (total 740)
      posCombinationCap = updatePOSCombinationAmounts('123', 0, 740, posCombinationCap, betTypeId, currentDraw);
      
      const combinationAmounts: Record<string, number> = {};

      // Try to add rambol 321 = 20 (would make total 760, exceeds 750)
      // Remaining = 750 - 740 = 10
      const result = checkLocalSoldOut(
        '321',
        'rambol',
        0,
        20,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        false,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(true);
      expect(result.reason).toBe('local');
      expect(result.maxRambol).toBe(10);
      expect(result.remaining).toBe(10);
    });

    it('should return maximum bet amount for user scenario: Bet 123-10 and rambol 321-10, then try to add more', () => {
      const serverSoldouts: any[] = [];
      let posCombinationCap: Record<string, number> = {};
      
      // User's scenario: Bet 123-10 and rambol 321-10, total = 20
      // But for testing, let's use a scenario where it would exceed
      // Existing: target 123 = 10, rambol 123 = 10 (total 20)
      posCombinationCap = updatePOSCombinationAmounts('123', 10, 10, posCombinationCap, betTypeId, currentDraw);
      
      // If limit is 30, remaining = 10
      // But our limit is 750, so let's adjust: existing = 740, total = 740
      posCombinationCap = {};
      posCombinationCap = updatePOSCombinationAmounts('123', 740, 0, posCombinationCap, betTypeId, currentDraw);
      
      const combinationAmounts: Record<string, number> = {};

      // Try to add target 123 = 11 (would make total 751, exceeds 750)
      const result = checkLocalSoldOut(
        '123',
        'target',
        11,
        0,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        false,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(true);
      expect(result.reason).toBe('local');
      expect(result.maxTarget).toBe(10); // 750 - 740 = 10
      expect(result.remaining).toBe(10);
    });

    it('should return maximum bet amount for 15-min limit when target exceeds limit', () => {
      const serverSoldouts: any[] = [];
      const posCombinationCap: Record<string, number> = {};
      let combinationAmounts: Record<string, number> = {};
      
      // Existing: target 123 = 40, rambol 123 = 0 (total 40)
      combinationAmounts = updateCombinationAmounts('123', 40, 0, combinationAmounts, betTypeId, currentDraw);

      // Try to add target 123 = 15 (would make total 55, exceeds 50)
      // Remaining = 50 - 40 = 10
      const result = checkLocalSoldOut(
        '123',
        'target',
        15,
        0,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true, // Within cutoff
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(true);
      expect(result.reason).toBe('15min');
      expect(result.maxTarget).toBe(10);
      expect(result.remaining).toBe(10);
    });

    it('should return maximum bet amount for 15-min limit when rambol exceeds limit', () => {
      const serverSoldouts: any[] = [];
      const posCombinationCap: Record<string, number> = {};
      let combinationAmounts: Record<string, number> = {};
      
      // Existing: target 123 = 0, rambol 123 = 40 (total 40)
      combinationAmounts = updateCombinationAmounts('123', 0, 40, combinationAmounts, betTypeId, currentDraw);

      // Try to add rambol 321 = 15 (would make total 55, exceeds 50)
      // Remaining = 50 - 40 = 10
      const result = checkLocalSoldOut(
        '321',
        'rambol',
        0,
        15,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true, // Within cutoff
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(true);
      expect(result.reason).toBe('15min');
      expect(result.maxRambol).toBe(10);
      expect(result.remaining).toBe(10);
    });

    it('should return maximum bet amount for 15-min limit: user scenario with 123-10 and rambol 321-10', () => {
      const serverSoldouts: any[] = [];
      const posCombinationCap: Record<string, number> = {};
      let combinationAmounts: Record<string, number> = {};
      
      // User's scenario: Bet 123-10 and rambol 321-10, total = 20
      combinationAmounts = updateCombinationAmounts('123', 10, 10, combinationAmounts, betTypeId, currentDraw);

      // If limit is 30, remaining = 10
      // But our limit is 50, so let's adjust: existing = 40, total = 40
      combinationAmounts = {};
      combinationAmounts = updateCombinationAmounts('123', 40, 0, combinationAmounts, betTypeId, currentDraw);

      // Try to add target 123 = 15 (would make total 55, exceeds 50)
      const result = checkLocalSoldOut(
        '123',
        'target',
        15,
        0,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true, // Within cutoff
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(true);
      expect(result.reason).toBe('15min');
      expect(result.maxTarget).toBe(10); // 50 - 40 = 10
      expect(result.remaining).toBe(10);
    });

    it('should handle exact limit scenario - should pass when at limit', () => {
      const serverSoldouts: any[] = [];
      let posCombinationCap: Record<string, number> = {};
      
      // Existing: target 123 = 740, rambol 123 = 0 (total 740)
      posCombinationCap = updatePOSCombinationAmounts('123', 740, 0, posCombinationCap, betTypeId, currentDraw);
      
      const combinationAmounts: Record<string, number> = {};

      // Try to add target 123 = 10 (would make total 750, exactly at limit, should pass)
      const result = checkLocalSoldOut(
        '123',
        'target',
        10,
        0,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        false,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(false);
      expect(result.reason).toBe(null);
    });
  });

  describe('Combined Target and Rambol Scenarios', () => {
    it('should sum target + rambol for local soldout check', () => {
      const serverSoldouts: any[] = [];
      let posCombinationCap: Record<string, number> = {};
      
      // Existing: target 123 = 400, rambol 123 = 300 (total 700)
      posCombinationCap = updatePOSCombinationAmounts('123', 400, 300, posCombinationCap, betTypeId, currentDraw);
      
      const combinationAmounts: Record<string, number> = {};

      // Try to add: target 123 = 30, rambol 321 = 30
      // Total = 400 + 30 (target) + 300 + 30 (rambol) = 760, exceeds 750
      const result = checkLocalSoldOut(
        '123',
        'target',
        30,
        30,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(true);
      expect(result.reason).toBe('local');
    });

    it('should sum target + rambol for 15-min limit check', () => {
      const serverSoldouts: any[] = [];
      const posCombinationCap: Record<string, number> = {};
      let combinationAmounts: Record<string, number> = {};
      
      // Existing: target 123 = 20, rambol 123 = 20 (total 40)
      combinationAmounts = updateCombinationAmounts('123', 20, 20, combinationAmounts, betTypeId, currentDraw);

      // Try to add: target 123 = 5, rambol 321 = 10
      // Total = 20 + 5 (target) + 20 + 10 (rambol) = 55, exceeds 50
      const result = checkLocalSoldOut(
        '123',
        'target',
        5,
        10,
        serverSoldouts,
        posCombinationCap,
        combinationAmounts,
        true,
        betTypeId,
        currentDraw,
      );

      expect(result.soldOut).toBe(true);
      expect(result.reason).toBe('15min');
    });
  });
});

