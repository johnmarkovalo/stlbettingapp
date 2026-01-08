# History Sync Feature Documentation

This document provides a comprehensive guide to the History Sync feature in BettingApp, including architecture, data flow, error handling, and troubleshooting.

## Overview

The History Sync feature ensures that transactions are properly synchronized between the local SQLite database and the remote server. It handles:

- Downloading transactions from server that don't exist locally
- Uploading local transactions that haven't been synced to server
- Reconciling transactions that appear out of sync
- Providing real-time progress feedback to users

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     History Screen                          │
│                  (src/screens/AppScreens/History)           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  UI Layer                                            │   │
│  │  - FlatList of transactions                         │   │
│  │  - Sync progress indicator                          │   │
│  │  - Pull-to-refresh                                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  History Sync Manager                        │
│              (src/services/historySyncManager.ts)           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Orchestration Layer                                 │   │
│  │  - State machine                                    │   │
│  │  - Cancellation support                             │   │
│  │  - Progress broadcasting                            │   │
│  │  - Deduplication                                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│  Database Layer  │ │  API Layer   │ │  Batch Processor │
│ (DatabaseService)│ │  (api.ts)    │ │ (batchProcessor) │
└──────────────────┘ └──────────────┘ └──────────────────┘
```

### State Machine

```
                    ┌─────────┐
                    │  idle   │ ◄──────────────────────┐
                    └────┬────┘                        │
                         │ requestSync()               │
                         ▼                             │
               ┌─────────────────┐                     │
               │  loading_local  │                     │
               └────────┬────────┘                     │
                        │                              │
                        ▼                              │
              ┌──────────────────┐                     │
              │ fetching_server  │                     │
              └────────┬─────────┘                     │
                       │                               │
                       ▼                               │
                ┌────────────┐                         │
                │  comparing │                         │
                └──────┬─────┘                         │
                       │                               │
                       ▼                               │
                 ┌──────────┐                          │
                 │  saving  │                          │
                 └────┬─────┘                          │
                      │                                │
                      ▼                                │
               ┌────────────┐                          │
               │ uploading  │                          │
               └──────┬─────┘                          │
                      │                                │
         ┌────────────┼────────────┐                   │
         ▼            ▼            ▼                   │
   ┌──────────┐ ┌───────────┐ ┌──────────┐           │
   │ complete │ │   error   │ │cancelled │           │
   └────┬─────┘ └─────┬─────┘ └────┬─────┘           │
        │             │            │                  │
        └─────────────┴────────────┴──────────────────┘
                      resetState()
```

## Data Flow

### Complete Sync Flow

```
1. USER OPENS HISTORY SCREEN
   │
   ├─► Load local transactions (optimistic UI)
   │   └─► Display immediately to user
   │
   └─► Start background sync
       │
       ├─► [Step 1] loading_local
       │   └─► Get local transaction ticketcodes
       │
       ├─► [Step 2] fetching_server
       │   └─► API: GET /transactions/{keycode}/betTypes/{type}
       │       └─► Returns array of ticketcodes
       │
       ├─► [Step 3] comparing
       │   ├─► Find server ticketcodes NOT in local
       │   └─► These are "missing" transactions
       │
       ├─► [Step 4] saving
       │   └─► For each missing ticketcode:
       │       ├─► API: GET /transactions/{ticketcode}
       │       └─► Insert into local DB with status='synced'
       │
       ├─► [Step 4.5] reconciling (CRITICAL)
       │   ├─► Get local transactions with status != 'synced'
       │   ├─► Check if their ticketcodes exist on server
       │   └─► Mark matching as 'synced' (no re-upload needed)
       │
       ├─► [Step 5] uploading
       │   └─► For each local unsynced transaction:
       │       ├─► Skip if ticketcode already on server
       │       ├─► API: POST /transactions
       │       └─► Update local status to 'synced'
       │
       └─► [Step 6] complete
           └─► Return final transaction list
```

### Transaction Status Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                  LOCAL TRANSACTION CREATION                  │
│                                                              │
│   User creates bet → Insert DB → Print → Upload → Synced    │
│                          │          │        │       │       │
│                     status=null  printed  synced  synced     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  SERVER TRANSACTION DOWNLOAD                 │
│                                                              │
│   Fetch from server → Insert DB with status='synced'        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     RECONCILIATION                           │
│                                                              │
│   Local 'unsynced' + Exists on server → Update to 'synced'  │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/transactions/{keycode}/betTypes/{type}` | GET | Get ticketcodes for date/draw/type |
| `/transactions/{ticketcode}` | GET | Get full transaction details |
| `/transactions/bulk` | POST | Get multiple transactions at once |
| `/transactions` | POST | Upload new transaction |
| `/transactions/bulk` | POST | Upload multiple transactions |

## Database Schema

### Transactions Table (`trans`)

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| ticketcode | TEXT | Unique identifier |
| betdate | TEXT | Bet date (YYYY-MM-DD) |
| bettime | INTEGER | Draw number (1, 2, 3...) |
| bettypeid | INTEGER | Bet type ID |
| status | TEXT | 'synced', 'printed', null |
| total | REAL | Total amount |
| trans_data | TEXT | JSON string of bets |
| trans_no | INTEGER | Transaction number |
| created_at | TEXT | Timestamp |

### Bets Table (`bets`)

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| transid | INTEGER | Foreign key to trans |
| betnumber | TEXT | The bet number |
| targetAmount | REAL | Target bet amount |
| rambolAmount | REAL | Rambol bet amount |

## Error Handling

### Network Errors

```typescript
// Connection lost during sync
catch (error) {
  if (error.name === 'AbortError') {
    // User cancelled or network timeout
    return localData;
  }
  // Return local data on any network error
  return localData;
}
```

### Rate Limiting (429 Errors)

The API Queue handles 429 errors with:
1. Exponential backoff retry
2. Circuit breaker (stops after 5 consecutive failures)
3. 30-second cool-off period

### Duplicate Transaction Handling

```typescript
// Server returns 409 Conflict
if (error?.response?.status === 409) {
  // Transaction already exists, mark as synced
  alreadyOnServerCodes.push(tx.ticketcode);
}
```

## Usage Examples

### Basic Sync

```typescript
import { historySyncManager } from '../services/historySyncManager';

// In History screen
const handleSync = async () => {
  const result = await historySyncManager.requestSync({
    token: authToken,
    date: '2026-01-08',
    draw: 1,
    type: 2,
    keycode: user.keycode,
  });

  if (result.success) {
    setTransactions(result.transactions);
    setTotalAmount(result.totalAmount);
  }
};
```

### With Progress Tracking

```typescript
// Subscribe to progress updates
useEffect(() => {
  const unsubscribe = historySyncManager.subscribe((progress) => {
    setSyncState(progress.state);
    setSyncMessage(progress.message);
    setProcessed(progress.processed);
    setTotal(progress.total);
  });

  return unsubscribe;
}, []);
```

### Cancellation

```typescript
// Cancel sync when navigating away
useEffect(() => {
  return () => {
    if (historySyncManager.isSyncing()) {
      historySyncManager.cancel();
    }
  };
}, []);
```

### Check Sync Status

```typescript
// Prevent duplicate syncs
const handleManualSync = () => {
  if (historySyncManager.isSyncing()) {
    console.log('Sync already in progress');
    return;
  }
  performSync();
};
```

## Troubleshooting

### Problem: Transactions stay "unsynced"

**Symptoms**: Local transactions show as unsynced even after syncing

**Causes**:
1. Network timeout during upload
2. App crash after server accepted
3. Transaction synced from another device

**Solution**: The reconciliation step (Step 4.5) automatically fixes this by:
1. Comparing local unsynced ticketcodes with server ticketcodes
2. Marking matches as 'synced' without re-uploading

### Problem: Duplicate API calls

**Symptoms**: Multiple identical API requests in logs

**Causes**:
1. Multiple sync triggers (focus, refresh, etc.)
2. No deduplication

**Solution**: 
1. `historySyncManager.isSyncing()` prevents concurrent syncs
2. Same params return existing promise
3. API queue deduplicates requests

### Problem: 429 Too Many Requests

**Symptoms**: Server throttling errors

**Causes**:
1. Too many concurrent requests
2. No rate limiting

**Solution**:
1. API queue limits concurrent requests to 2
2. 1-second delay between batches
3. Circuit breaker stops requests after 5 failures
4. 30-second cool-off period

### Problem: Slow sync performance

**Symptoms**: Sync takes too long

**Causes**:
1. Fetching all transaction details one by one
2. No batch operations

**Solution**:
1. Server returns ticketcodes only (not full data)
2. Bulk API for fetching multiple transactions
3. Batch database inserts
4. Skip transactions already on server

## Logging

### Log Prefixes

| Prefix | Component |
|--------|-----------|
| `🚀 [SyncManager]` | Sync start |
| `📊 [SyncManager]` | Statistics |
| `📦 [SyncManager]` | Batch operations |
| `🔄 [SyncManager]` | Reconciliation |
| `📤 [SyncManager]` | Upload operations |
| `✅ [SyncManager]` | Success |
| `❌ [SyncManager]` | Error |
| `📛 [SyncManager]` | Cancellation |
| `ℹ️ [SyncManager]` | Info (skipped, etc.) |

### Example Log Output

```
🚀 [SyncManager] Starting sync: 2026-01-08_1_2
📊 [SyncManager] Found 50 local transactions
📊 [SyncManager] Found 71 server transactions
📊 [SyncManager] 21 transactions to fetch
📦 [SyncManager] Using individual requests for 21 transactions
✅ [SyncManager] Fetched 21 full transaction details
🔄 [SyncManager] Found 3 local "unsynced" transactions that are already on server
✅ [SyncManager] Marked 3 transactions as synced
📤 [SyncManager] Uploading 2 unsynced transactions
ℹ️ [SyncManager] Skipping 6437-12-260108-093752 - already on server
✅ [SyncManager] Sync complete: 71 transactions, total: 4892
```

## Testing

### Manual Testing Checklist

- [ ] Fresh install sync (no local data)
- [ ] Sync with existing local data
- [ ] Sync with unsynced local transactions
- [ ] Sync with poor network connection
- [ ] Cancel sync mid-operation
- [ ] Rapid filter changes during sync
- [ ] Pull-to-refresh during sync
- [ ] Background/foreground during sync

### Edge Cases to Test

1. **No internet**: Should show local data only
2. **Server down**: Should fall back to local data
3. **Empty server response**: Should show local data
4. **Duplicate ticketcodes**: Should not create duplicates
5. **Concurrent syncs**: Should deduplicate
6. **Large dataset**: Should handle 1000+ transactions

## Configuration

### Tunable Parameters

| Parameter | Location | Default | Description |
|-----------|----------|---------|-------------|
| `STALE_THRESHOLD` | historySyncManager | 30000ms | Time before data is considered stale |
| `MAX_CONCURRENT` | apiQueue | 2 | Max concurrent API requests |
| `RATE_LIMIT_DELAY` | apiQueue | 1000ms | Delay between request batches |
| `CACHE_TTL` | apiQueue | 30000ms | API response cache duration |
| `CIRCUIT_BREAKER_THRESHOLD` | apiQueue | 5 | Failures before circuit opens |
| `CIRCUIT_BREAKER_RESET_TIME` | apiQueue | 30000ms | Time before circuit half-opens |

## Future Enhancements

1. **Background Sync Service**: Sync transactions even when app is in background
2. **Offline Queue**: Queue transactions when offline, sync when back online
3. **Conflict Resolution**: Handle cases where same transaction edited on multiple devices
4. **Incremental Sync**: Only fetch transactions newer than last sync timestamp
5. **Compression**: Compress large payloads for faster transfer
6. **Sync Analytics**: Track sync success rates, durations, errors
