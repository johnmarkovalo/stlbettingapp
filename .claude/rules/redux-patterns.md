---
paths:
  - "src/store/**/*.ts"
  - "src/store/**/*.js"
---

# Redux Patterns

## Store Structure

```
src/store/
├── store.js           # Store configuration with Redux Persist
├── actions/           # Action creators
├── constants/         # Action type constants
├── reducers/          # Reducers
├── selectors/         # Memoized selectors
└── services/          # API services for actions
```

## Reducer Slices

| Reducer | Purpose |
|---------|---------|
| auth | User authentication, token |
| types | Bet type configurations |
| soldouts | Server sold-out combinations |
| localSoldOuts | Local sold-out tracking |
| printer | Printer configuration |
| combinationAmounts | Bet combination totals |
| posCombinationCap | POS capping limits |

## Action Naming Convention

- `SET_*` - Replace state value
- `ADD_*` - Add to array
- `REMOVE_*` - Remove from array
- `UPDATE_*` - Update existing item
- `SYNC_*` - Sync with server
- `CLEAR_*` - Clear/reset state

## Redux Persist

- Persisted to AsyncStorage
- Whitelist: `auth`, `types`, `printer`
- Do NOT persist: transient data like loading states
