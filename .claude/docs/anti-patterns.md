# Anti-Patterns to Avoid

## React Native Anti-Patterns

### Inline Styles
```typescript
// BAD
<View style={{ flex: 1, padding: 16 }}>

// GOOD
<View style={styles.container}>
const styles = StyleSheet.create({ container: { flex: 1, padding: 16 } });
```

### Missing Keys
```typescript
// BAD
{items.map(item => <Card item={item} />)}

// GOOD
{items.map(item => <Card key={item.id} item={item} />)}
```

---

## Redux Anti-Patterns

### Mutating State
```typescript
// BAD
state.items.push(newItem);

// GOOD
return { ...state, items: [...state.items, newItem] };
```

### Not Using Selectors
```typescript
// BAD
const items = useSelector(state => state.transactions.data.filter(...));

// GOOD
const items = useSelector(selectFilteredTransactions);
```

---

## Offline-First Anti-Patterns

### Ignoring Sync Errors
```typescript
// BAD
await api.sync(data); // Hope it works

// GOOD
try {
    await api.sync(data);
    await db.markSynced(id);
} catch {
    // Keep in queue for retry
}
```

### Not Saving Locally First
```typescript
// BAD
await api.create(transaction); // Fails offline

// GOOD
await db.save(transaction); // Local first
await api.sync(transaction); // Then remote
```
