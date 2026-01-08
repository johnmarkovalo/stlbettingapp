# TransacScreen Optimization Documentation

## Overview

The `TransacScreen` is the main transaction entry screen for the BettingApp. It handles:
- Bet number input (3 digits)
- Target and rambol amount entry
- Soldout validation (server, POS cap, 15-minute limit)
- Bet list management
- Transaction creation and printing

This document covers the architecture, optimizations, and key patterns used.

---

## Architecture

### Component Structure

```
TransacScreen
├── Redux Selectors (with shallowEqual)
├── Custom Hooks
│   ├── useInputReducer (input state management)
│   └── useSoldoutChecker (centralized soldout validation)
├── Data Fetching (dirty flag pattern)
├── Input Handling
├── Bet Management
├── Transaction Creation
└── Render Functions (memoized)
```

### File Locations

| File | Purpose |
|------|---------|
| `src/screens/AppScreens/Home/TransacScreen.tsx` | Main component |
| `src/hooks/useInputReducer.ts` | Input state management hook |
| `src/hooks/useSoldoutChecker.ts` | Soldout checking hook |
| `src/hooks/useCombinationAmounts.ts` | Data fetching hook |
| `src/store/selectors/transactionSelectors.ts` | Redux selectors |

---

## Custom Hooks

### 1. useInputReducer

**Purpose**: Consolidates three separate `useState` hooks into a single `useReducer` for better performance.

**Before (3 separate states)**:
```typescript
const [betNumber, setBetNumber] = useState<InputState>({value: '', isFocus: true});
const [targetAmount, setTargetAmount] = useState<InputState>({value: '', isFocus: false});
const [rambolAmount, setRambolAmount] = useState<InputState>({value: '', isFocus: false});
```

**After (single reducer)**:
```typescript
const {
  betNumber,
  targetAmount,
  rambolAmount,
  focusedField,
  setValue,
  setFocus,
  resetAfterBet,
  // ...other utilities
} = useInputReducer();
```

**Benefits**:
- Single state update for complex operations
- Reduced re-renders (3 → 1 per input cycle)
- Cleaner action-based state transitions
- Memoized computed values (targetAmountNum, rambolAmountNum)

**State Shape**:
```typescript
interface InputState {
  betNumber: string;
  targetAmount: string;
  rambolAmount: string;
  focusedField: 'betNumber' | 'targetAmount' | 'rambolAmount';
  lastAction: 'forward' | 'backward' | 'manual' | 'reset';
}
```

**CRITICAL: lastAction Pattern**

The `lastAction` field tracks **how** the state was changed, which determines whether auto-advance should trigger:

| lastAction | Meaning | Auto-advance? |
|------------|---------|---------------|
| `forward` | User added a digit | ✅ YES |
| `backward` | User deleted or backspaced | ❌ NO |
| `manual` | User tapped on a field | ❌ NO |
| `reset` | Fields were reset | ❌ NO |

**Why this matters:**
- Without this, when user backspaces from targetAmount to betNumber (which already has 3 digits), the auto-advance effect would immediately trigger and move focus back to targetAmount
- This prevents the user from editing an already-complete field

### 2. useSoldoutChecker

**Purpose**: Centralizes all soldout checking logic with caching to prevent redundant checks.

**Before (5+ entry points)**:
- `onKeyPress()` when bet reaches 3 digits
- `validateBet()` 
- `changeFocus()`
- `onNext()`
- `useEffect` auto-focus

**After (single hook)**:
```typescript
const {checkSoldout, checkServerSoldout, clearCache} = useSoldoutChecker({
  betTypeId,
  currentDraw,
  betDate,
  serverSoldouts,
  combinationAmounts,
  posCombinationCap,
  currentBets: bets,
  isWithinCutoff,
  isOnline,
});
```

**Hierarchical Check Order**:
1. **Server Soldouts** (from API/Redux) - Always checked
2. **POS Cap (750)** - Always checked (includes current bets)
3. **15-minute Limit (50)** - Within cutoff only

**Caching**:
- Results are cached by `${betNumber}_${targetAmt}_${rambolAmt}`
- Cache is cleared when:
  - `serverSoldouts` changes
  - `combinationAmounts` changes
  - `posCombinationCap` changes
  - After adding/removing a bet

---

## Data Fetching Pattern

### Dirty Flag Pattern

**Problem**: Continuous 30-second intervals caused unnecessary database queries.

**Solution**: Event-driven fetching with dirty flags.

```typescript
// Track when data needs refresh
const needsRefresh = useRef({
  combinationAmounts: true,
  posCombinationAmounts: true,
});

// Only fetch when dirty
const fetchCombinationAmounts = useCallback(async () => {
  if (!needsRefresh.current.combinationAmounts) return;
  
  const amounts = await getCombinationAmounts(...);
  dispatch(combinationAmountsActions.update(amounts));
  needsRefresh.current.combinationAmounts = false;
}, [...]);

// Mark dirty after transaction creation
const createTransaction = useCallback(async () => {
  // ... transaction logic
  markDataDirty(); // Triggers refresh on next check
}, [...]);
```

**Benefits**:
- Reduces database queries by ~50%
- Data is fetched only when actually stale
- Backup interval still runs (60s instead of 30s)

---

## Input Flow

### Flow Diagram

```
Key Press (digit)
    ↓
setValue(field, value, 'forward')  ← marks action as 'forward'
    ↓
useEffect checks shouldAutoAdvance
    ↓
if (shouldAutoAdvanceFromBetNumber) → checkSoldout → handleAutoAdvanceFocus('targetAmount')
    or
if (shouldAutoAdvanceFromTargetAmount) → checkSoldout → handleAutoAdvanceFocus('rambolAmount')
```

```
Backspace
    ↓
setValue(field, value, 'backward')  ← marks action as 'backward'
    ↓
useEffect checks shouldAutoAdvance
    ↓
shouldAutoAdvance is FALSE because lastAction is 'backward'
    ↓
No auto-advance occurs → User can edit existing value
```

### Focus Change Types

Three types of focus changes with different purposes:

```typescript
// 1. Manual focus - user taps on field
handleManualFocusChange(field)  // Sets lastAction to 'manual'

// 2. Auto-advance focus - triggered by completing a field
handleAutoAdvanceFocus(field)   // Keeps lastAction as 'forward'

// 3. Backward focus - backspace to previous field  
handleBackwardFocusChange(field) // Sets lastAction to 'backward'
```

### Auto-Focus Logic

```typescript
// CRITICAL: Only auto-advance when lastAction is 'forward'
useEffect(() => {
  // shouldAutoAdvanceFromBetNumber combines:
  // - isBetNumberComplete (3 digits)
  // - isBetNumberFocused
  // - lastAction === 'forward'
  if (shouldAutoAdvanceFromBetNumber) {
    const result = checkSoldout(betNumber, 0, 0, true);
    if (!result.isSoldOut) {
      handleAutoAdvanceFocus('targetAmount');
    } else {
      resetAfterBet();
    }
  }
}, [shouldAutoAdvanceFromBetNumber, ...]);

useEffect(() => {
  if (shouldAutoAdvanceFromTargetAmount && canAddRambol) {
    const result = checkSoldout(betNumber, targetAmountNum, 0, true);
    if (!result.isSoldOut) {
      handleAutoAdvanceFocus('rambolAmount');
    } else {
      resetAfterBet();
    }
  }
}, [shouldAutoAdvanceFromTargetAmount, ...]);
```

### Example Scenarios

**Scenario 1: Normal input flow**
1. User types "1" → lastAction = 'forward'
2. User types "2" → lastAction = 'forward'
3. User types "3" → lastAction = 'forward', betNumber = "123"
4. useEffect: shouldAutoAdvanceFromBetNumber = true
5. Auto-advance to targetAmount ✅

**Scenario 2: User backspaces to edit**
1. Focus is on targetAmount (empty)
2. User presses backspace
3. handleBackwardFocusChange('betNumber') → lastAction = 'backward'
4. Focus moves to betNumber (already has "123")
5. useEffect: shouldAutoAdvanceFromBetNumber = false (lastAction is 'backward')
6. User can edit betNumber ✅

**Scenario 3: User taps to edit**
1. Focus is on rambolAmount
2. User taps on betNumber field
3. handleManualFocusChange('betNumber') → lastAction = 'manual'
4. Focus moves to betNumber (already has "123")
5. useEffect: shouldAutoAdvanceFromBetNumber = false (lastAction is 'manual')
6. User can edit betNumber ✅

---

## Soldout Business Logic

### Understanding the Limits

| Limit | Value | When Applied | Scope |
|-------|-------|--------------|-------|
| Server Soldout | N/A | Always | Specific combination |
| POS Cap | 750 | Always (includes current bets) | Per draw |
| 15-minute Limit | 50 | Within 15min of cutoff | Per 15-min window |
| **Bets per Transaction** | **10** | **Always** | **Per transaction** |
| **Unsynced Transactions** | **15** | **Before new transaction** | **Global** |

### Transaction Limits

**Maximum 10 Bets per Transaction**
- Users cannot add more than 10 bets to a single transaction
- Visual indicator shows current count: "Bets: X/10"
- When limit reached, shows warning in red

**Maximum 15 Unsynced Transactions**
- Users cannot create new transactions if they have 15+ unsynced transactions
- Forces users to sync before continuing
- Prevents offline transaction buildup
- Warning shown when limit reached

**IMPORTANT: POS Cap (750) Calculation**

The 750 limit includes BOTH:
1. **DB Transactions**: Amounts from already-saved transactions (fetched via `posCombinationCap` from Redux)
2. **Current Bets**: Bets added to the current transaction but not yet saved to DB (via `currentBets` array)

```typescript
// calculateCurrentAmounts combines both sources:
let targetTotal = posCombinationCap[targetKey] || 0;  // From DB
let rambolTotal = posCombinationCap[rambolKey] || 0;  // From DB

// Add current bets (not yet in DB)
currentBets.forEach(bet => {
  if (bet.betNumber === betNumber) {
    targetTotal += bet.targetAmount || 0;
  }
  if (sortNumber(bet.betNumber) === sortedNumber) {
    rambolTotal += bet.rambolAmount || 0;
  }
});
```

### Target vs Rambol Amounts

**Target**: Separate per exact bet number
- Target 123 ≠ Target 321
- Each exact combination has its own pool

**Rambol**: Shared across all permutations
- Rambol 123 = Rambol 321 = Rambol 213 = Rambol 132 = Rambol 231 = Rambol 312
- All permutations share the same pool

### Example Calculation

```
Winning number: 123

Payout includes:
- All target bets with exact "123"
- All rambol bets with ANY permutation of "123"

Total Payout = target(123) + rambol(all permutations of 123)
```

### Triple Digit Handling

For triple digits (e.g., 111, 222, 333):
- Rambol input is disabled
- All permutations are the same number
- Only target amount is allowed

```typescript
const canAddRambol = useMemo(
  () => !checkIfTriple(betNumber),
  [betNumber],
);
```

---

## Performance Optimizations

### 1. Redux Selectors with shallowEqual

```typescript
const combinationAmounts = useSelector(
  (state: RootState) => state.combinationAmounts.amounts,
  shallowEqual, // Prevents re-renders if object reference changes but content is same
);
```

### 2. FlatList Optimizations

```typescript
<FlatList
  data={bets}
  renderItem={renderBetItem}
  keyExtractor={keyExtractor}
  removeClippedSubviews={true}  // Unmount off-screen items
  maxToRenderPerBatch={10}      // Limit items per render
  windowSize={5}                // Render window size
  getItemLayout={(_, index) => ({
    length: 60,
    offset: 60 * index,
    index,
  })}  // Fixed height optimization
/>
```

### 3. Memoized Render Functions

```typescript
const renderBetItem = useCallback(
  ({item}: {item: Bet}) => (
    <BetItem item={item} onPress={() => showRemoveAlert(item)} />
  ),
  [showRemoveAlert],
);
```

### 4. Reduced Intervals

| Before | After | Purpose |
|--------|-------|---------|
| 30s | 60s | Combination amounts refresh |
| 30s | 30s | Draw calculation (unchanged, critical) |

---

## Testing Checklist

After modifications, verify:

- [ ] Triple digit bet numbers disable rambol input
- [ ] Server soldout blocks bet immediately
- [ ] POS cap (750) works offline only
- [ ] 15-minute limit (50) works within cutoff only
- [ ] Rambol amounts share limits across permutations
- [ ] Target amounts are separate per exact number
- [ ] Focus auto-advances correctly
- [ ] Transaction creation works online and offline
- [ ] No duplicate alerts for same condition
- [ ] Debounced soldout check doesn't fire multiple alerts
- [ ] Cache is cleared after adding/removing bets
- [ ] Data is refreshed after transaction creation

---

## Common Issues & Solutions

### Issue: Stale Soldout Data

**Symptom**: Soldout status doesn't reflect recent bets.

**Solution**: Ensure `clearCache()` is called after:
- Adding a bet
- Removing a bet
- Fetching new amounts from database

### Issue: Multiple Alerts

**Symptom**: Same soldout alert appears multiple times.

**Solution**: 
- Use debounced soldout check
- Ensure only one check runs per input cycle
- Check `showAlert` parameter

### Issue: Focus Not Advancing

**Symptom**: Cursor stays on same field after completing input.

**Solution**: Check that:
- `isBetNumberComplete` is true
- Soldout check returns `isSoldOut: false`
- `handleFocusChange` is called

---

## Related Documentation

- [OPTIMIZATIONS.md](./OPTIMIZATIONS.md) - Database and API optimizations
- [HISTORY_SYNC.md](./HISTORY_SYNC.md) - History sync feature
- [DATABASE_SERVICE_USAGE.md](./DATABASE_SERVICE_USAGE.md) - Database service patterns
