# Development Patterns

## React Native Patterns

### Component Pattern
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
    title: string;
    value: number;
}

export const MetricCard: React.FC<Props> = ({ title, value }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.value}>{value}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { padding: 16 },
    title: { fontSize: 14 },
    value: { fontSize: 24, fontWeight: 'bold' },
});
```

---

## Redux Patterns

### Action Pattern
```typescript
export const fetchTransactions = () => async (dispatch: Dispatch) => {
    dispatch({ type: 'TRANSACTIONS_LOADING' });
    try {
        const data = await api.getTransactions();
        dispatch({ type: 'TRANSACTIONS_SUCCESS', payload: data });
    } catch (error) {
        dispatch({ type: 'TRANSACTIONS_ERROR', payload: error.message });
    }
};
```

### Reducer Pattern
```typescript
const initialState = {
    data: [],
    loading: false,
    error: null,
};

export const transactionsReducer = (state = initialState, action) => {
    switch (action.type) {
        case 'TRANSACTIONS_LOADING':
            return { ...state, loading: true };
        case 'TRANSACTIONS_SUCCESS':
            return { ...state, loading: false, data: action.payload };
        case 'TRANSACTIONS_ERROR':
            return { ...state, loading: false, error: action.payload };
        default:
            return state;
    }
};
```

---

## Offline-First Pattern

### SQLite Cache
```typescript
// Save to local DB first
await db.saveTransaction(transaction);

// Then sync to server
try {
    await api.syncTransaction(transaction);
    await db.markSynced(transaction.id);
} catch (error) {
    // Will retry on next sync
}
```

### Sync Queue
```typescript
const pendingTransactions = await db.getPendingSync();
for (const tx of pendingTransactions) {
    try {
        await api.sync(tx);
        await db.markSynced(tx.id);
    } catch (error) {
        // Keep in queue for retry
    }
}
```
