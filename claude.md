# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Last Updated:** 2026-01-13
> **Updated By:** Claude

> **IMPORTANT:** Always update this file when making major changes to the codebase (new features, API changes, architectural changes, new services, etc.). Add entries to "Recent Changes" and update relevant sections.

## Recent Changes
<!-- Claude appends here when making updates -->
- 2026-01-13: Added Reset Sync Status feature - new screen in Settings to reset transaction status from "synced" back to "printed" for re-syncing by date and draw
- 2026-01-12: Added Ecosystem Integration section showing relationship with ZianAdmin and zian-api
- 2026-01-12: Fixed transaction sync bug - added response validation before marking as synced; added reconciliation feature (long-press sync button in History)
- 2026-01-11: Initial comprehensive summary created with full architecture documentation and backend integration

---

## Project Overview

BettingApp is a React Native betting application built with TypeScript, Redux, SQLite, and React Navigation. It handles transactions, bets, results, and integrates with thermal printers for receipt printing. The app operates in an offline-first architecture with sync capabilities to the **zian-api** Laravel backend.

**Project Role:** Mobile Betting Application (Android/iOS)
**Backend API:** `../zian-api/` (sibling directory)
**Admin Portal:** `../ZianAdmin/` (sibling directory)

---

## Ecosystem Integration

### Project Relationships

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Zian Gaming Ecosystem                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐        ┌──────────────┐        ┌──────────────┐     │
│   │  BettingApp  │        │  ZianAdmin   │        │   zian-api   │     │
│   │  (Mobile)    │        │  (Admin)     │        │  (Backend)   │     │
│   │  ★ YOU ARE   │        │              │        │              │     │
│   │    HERE      │        │              │        │              │     │
│   └──────┬───────┘        └──────┬───────┘        └──────┬───────┘     │
│          │                       │                        │             │
│          │    Transactions       │    Proxy Requests      │             │
│          ├──────────────────────►├──────────────────────►│             │
│          │    Results            │    Dashboard Data      │             │
│          ├──────────────────────►├──────────────────────►│             │
│          │    Sold-outs          │    Agent Management    │             │
│          ├──────────────────────►├──────────────────────►│             │
│          │                       │                        │             │
│          │         Direct API Calls (v2 endpoints)        │             │
│          └───────────────────────────────────────────────►│             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### BettingApp's Role in the Ecosystem

| Responsibility | Description |
|----------------|-------------|
| **Transaction Creation** | Creates bets locally, syncs to zian-api |
| **Offline-First** | Works without internet, syncs when available |
| **Receipt Printing** | Prints tickets via thermal printer |
| **Results Display** | Fetches and displays draw results |
| **Sold-out Enforcement** | Blocks bets on sold-out combinations |

### Data Flow Summary

| Data Type | Direction | Flow |
|-----------|-----------|------|
| **Transactions** | App → API | Create locally → Print → Sync to zian-api |
| **Results** | API → App | zian-api (auto-scraped) → App fetches |
| **Sold-outs** | API → App | zian-api (auto-calculated) → App enforces |
| **Bet Types** | API → App | Admin configures → API stores → App fetches |
| **Agent Config** | API → App | Admin manages → API stores → App uses keycode |

### API Endpoints Used (v2)

| Endpoint | Purpose |
|----------|---------|
| `POST /v2/login` | Employee authentication |
| `GET /v2/betTypes` | Fetch bet type configurations |
| `GET /v2/soldOuts` | Fetch sold-out combinations |
| `POST /v2/transactions` | Submit new transaction |
| `POST /v2/transactions/bulk` | Bulk fetch transactions |
| `POST /v2/transactions/bulk-sync` | Bulk sync transactions |
| `GET /v2/results/{type}/draws/{draw}` | Fetch draw results |

### Shared Database Tables (on zian-api)

| Table | BettingApp Usage |
|-------|------------------|
| `employees` | Login authentication |
| `transaction` | Sync destination |
| `bet` | Bet details |
| `results` | Draw results |
| `sold_outs` | Combination blocking |
| `settings` | Bet type configuration |

---

## Commands

### Development
```bash
npm install          # Install dependencies
npm start            # Start Metro bundler
npm run android      # Run on Android device
npm run ios          # Run on iOS device
npm test             # Run all tests (Jest)
npm run lint         # Run ESLint
```

### Android Build
```bash
cd android && ./gradlew assembleDebug     # Debug build
cd android && ./gradlew assembleRelease   # Release build
```

## Requirements
- Node.js >=18.x
- React Native CLI
- Android Studio (for Android)
- Xcode 14+ (for iOS)
- Physical device recommended for printer testing

---

## Complete Directory Structure

```
BettingApp/
├── src/
│   ├── App.tsx                    # Root component with Redux Provider, PersistGate, database init
│   ├── assets/
│   │   ├── Fonts/                 # Nunito font family (20 font files)
│   │   ├── Icons/                 # App icons (25+ icons)
│   │   ├── InCall/                # In-call related images
│   │   └── Login/                 # Login screen assets (logos)
│   ├── components/                # Reusable UI components
│   │   ├── shared/
│   │   │   └── BaseModal.tsx      # Base modal component
│   │   ├── BetItem.tsx            # Individual bet display
│   │   ├── DrawModal.tsx          # Draw time selection modal
│   │   ├── PrinterDemo.tsx        # Printer testing component
│   │   ├── ResultTransactionBets.tsx
│   │   ├── ResultTransactionItem.tsx
│   │   ├── TransactionBetItem.tsx
│   │   ├── TransactionBets.tsx
│   │   ├── transactionItem.tsx
│   │   ├── TypeModal.tsx          # Bet type selection modal
│   │   └── index.ts
│   ├── config/
│   │   └── appConfig.js           # App-wide configuration (API URL, etc.)
│   ├── database/                  # SQLite database layer
│   │   ├── DatabaseService.ts     # Singleton database service (1900+ lines) - CRITICAL
│   │   ├── DatabaseSchema.ts      # Database schema definitions
│   │   ├── DatabaseTypes.ts       # TypeScript types for database
│   │   ├── SQLBuilder.ts          # SQL query builder utility
│   │   ├── sqlite.ts              # Legacy SQLite functions
│   │   ├── clearDatabase.ts       # Database clearing utility
│   │   └── index.ts
│   ├── helper/                    # Utility functions
│   │   ├── api.ts                 # API service (axios client) - CRITICAL
│   │   ├── apiQueue.ts            # Request queue with deduplication
│   │   ├── batchProcessor.ts      # Batch processing utility
│   │   ├── DatabaseSchema.ts      # Legacy schema
│   │   ├── sqlite.ts              # Legacy SQLite helpers
│   │   ├── functions.js           # Business logic utilities
│   │   ├── android-permissions.js
│   │   ├── localNotification.js
│   │   └── index.ts
│   ├── hooks/                     # Custom React hooks
│   │   ├── useCombinationAmounts.ts
│   │   ├── useInputReducer.ts
│   │   ├── useSoldoutChecker.ts
│   │   └── index.ts
│   ├── models/                    # Data models
│   │   ├── Bet.ts                 # Bet model interface
│   │   ├── Transaction.ts         # Transaction model interface
│   │   ├── Result.ts              # Result model interface
│   │   ├── Type.ts                # Bet type model interface
│   │   └── index.ts
│   ├── native/                    # Native module integrations
│   │   └── nyx-printer/
│   │       └── index.tsx          # Custom NYX printer module
│   ├── navigation/
│   │   ├── AppNavigator.js        # Main app stack navigator
│   │   ├── AuthNavigator.js       # Authentication navigator
│   │   └── index.js
│   ├── screens/
│   │   ├── AppScreens/
│   │   │   ├── Home/
│   │   │   │   ├── index.tsx      # Home screen (betting entry)
│   │   │   │   ├── TransacScreen.tsx
│   │   │   │   └── Styles.ts
│   │   │   ├── History/
│   │   │   │   ├── index.tsx      # Transaction history screen
│   │   │   │   └── Styles.ts
│   │   │   ├── Result/
│   │   │   │   ├── index.tsx      # Results screen (winners)
│   │   │   │   └── Styles.ts
│   │   │   └── Setting/
│   │   │       ├── index.tsx      # Settings screen
│   │   │       ├── PrinterSetup/
│   │   │       │   └── index.tsx  # Printer configuration
│   │   │       ├── ResetStatus/
│   │   │       │   └── index.tsx  # Reset sync status screen
│   │   │       └── Styles.ts
│   │   └── AuthScreens/
│   │       ├── LoginScreen.tsx    # Login/PIN entry screen
│   │       └── Styles.ts
│   ├── services/
│   │   ├── historySyncManager.ts  # History sync orchestration - CRITICAL
│   │   └── updateService.ts       # App update service
│   ├── store/                     # Redux state management
│   │   ├── store.js               # Store configuration with Redux Persist
│   │   ├── actions/
│   │   │   ├── user.actions.ts
│   │   │   ├── types.actions.ts
│   │   │   ├── soldouts.actions.ts
│   │   │   ├── printer.actions.ts
│   │   │   ├── combinationAmounts.actions.ts
│   │   │   ├── posCombinationCap.actions.ts
│   │   │   ├── localSoldOuts.actions.ts
│   │   │   └── index.ts
│   │   ├── constants/
│   │   │   ├── user.constants.ts
│   │   │   ├── types.constants.ts
│   │   │   ├── soldouts.constants.ts
│   │   │   ├── printer.constants.ts
│   │   │   ├── combinationAmounts.constants.ts
│   │   │   ├── posCombinationCap.constants.ts
│   │   │   ├── localSoldOuts.constants.ts
│   │   │   └── index.ts
│   │   ├── reducers/
│   │   │   ├── auth.reducer.ts
│   │   │   ├── types.reducer.ts
│   │   │   ├── soldouts.reducer.ts
│   │   │   ├── printer.reducer.ts
│   │   │   ├── combinationAmounts.reducer.ts
│   │   │   ├── posCombinationCap.reducer.ts
│   │   │   ├── localSoldOuts.reducer.ts
│   │   │   └── index.ts
│   │   ├── selectors/
│   │   │   ├── transactionSelectors.ts
│   │   │   └── index.ts
│   │   └── services/
│   │       ├── user.service.ts
│   │       └── index.ts
│   ├── Styles/                    # Global styles
│   │   ├── Colors.ts              # Color constants
│   │   ├── Images.ts              # Image references
│   │   ├── Metrices.ts            # Responsive metrics (wp, hp)
│   │   └── Styles.ts              # Global style definitions
│   └── types/
│       └── react-native-vector-icons.d.ts
├── android/                       # Android native code
├── __tests__/                     # Test files
└── [config files]                 # package.json, tsconfig.json, etc.
```

---

## Key Files Map

| File | Purpose | Lines |
|------|---------|-------|
| **src/App.tsx** | Root component with providers, database initialization | - |
| **src/database/DatabaseService.ts** | **CRITICAL** - Singleton database service, all CRUD operations | 1900+ |
| **src/helper/api.ts** | **CRITICAL** - Axios API client, all backend communication | 480+ |
| **src/helper/apiQueue.ts** | Request deduplication, rate limiting, circuit breaker | - |
| **src/services/historySyncManager.ts** | **CRITICAL** - History sync orchestration, state machine | - |
| **src/store/store.js** | Redux store with Redux Persist | - |
| **src/config/appConfig.js** | API URL, app configuration | - |
| **src/database/SQLBuilder.ts** | SQL query builder utility | - |
| **src/helper/batchProcessor.ts** | Batch processing with concurrency control | - |

---

## Redux Store Structure

### Reducers (State Slices)

| Reducer | State Managed | Key Fields |
|---------|---------------|------------|
| **auth** | User authentication | `user`, `token`, `isLoading`, `error` |
| **types** | Bet types configuration | `types[]`, `activeTypes[]` |
| **soldouts** | Server sold-out combinations | `soldOuts[]` |
| **localSoldOuts** | Local sold-out tracking | `localSoldOuts[]` |
| **printer** | Printer configuration | `printerConfig`, `isConnected` |
| **combinationAmounts** | Bet combination totals | `amounts{}` |
| **posCombinationCap** | POS capping limits | `caps{}` |

### Key Actions

**User Actions** (`user.actions.ts`)
- `login()` / `logout()` - Authentication
- `setToken()` - Store auth token

**Types Actions** (`types.actions.ts`)
- `syncBetTypes()` - Sync bet types from server
- `setActiveTypes()` - Set active bet types

**SoldOuts Actions** (`soldouts.actions.ts`)
- `syncSoldOuts()` - Sync sold-outs from server
- `addSoldOut()` - Add local sold-out

---

## SQLite Database (DatabaseService)

### Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **trans** | Transactions | `id`, `ticketcode`, `betdate`, `bettime`, `bettypeid`, `total`, `status`, `trans_data`, `trans_no`, `created_at` |
| **bet** | Individual bets | `id`, `transid`, `tranno`, `betnumber`, `betnumberr`, `target`, `rambol`, `subtotal` |
| **result** | Draw results | `id`, `bettypeid`, `result`, `resultr`, `betdate`, `bettime`, `created_at` |
| **settings** | App settings | `key`, `value` |
| **maintenance_schedule** | Maintenance windows | `id`, `start_time`, `end_time`, `reason`, `is_active` |

### Transaction Status Values

| Status | Meaning |
|--------|---------|
| `null` | Just created, not printed |
| `'printed'` | Printed but not synced |
| `'synced'` | Successfully synced to server |

### Key DatabaseService Methods

| Method | Purpose |
|--------|---------|
| `initializeDatabase()` | Initialize DB and run migrations |
| `getTransactionsWithBets()` | JOIN query (avoids N+1) |
| `getCombinationAmounts()` | SQL aggregation for caps |
| `getTransactionByTicketCode()` | Single transaction lookup |
| `transactionExists()` | Existence check |
| `batchInsertTransactions()` | Batch insert from server |
| `updateTransactionStatusBatch()` | Batch status update |
| `updateTransactionStatusByDateTime()` | Update status by date and draw time (for reset feature) |
| `getTransactionCountByDateTime()` | Count transactions by date and draw time |
| `insertTransaction()` | Insert with duplicate detection |
| `getActiveMaintenanceSchedule()` | Check maintenance period |
| `cleanupOldData()` | Delete old records |

---

## Key Services & Patterns

### 1. History Sync Manager (`src/services/historySyncManager.ts`)

**Singleton service** orchestrating History screen sync operations.

```typescript
import { historySyncManager } from '../services/historySyncManager';

// Request sync
const result = await historySyncManager.requestSync(params);

// Check if syncing
if (historySyncManager.isSyncing()) { /* ... */ }

// Subscribe to progress
const unsubscribe = historySyncManager.subscribe(progress => { /* ... */ });

// Cancel sync
historySyncManager.cancel();
```

**State Machine Flow:**
```
idle → loading_local → fetching_server → comparing → saving → uploading → complete
```

### 2. API Queue (`src/helper/apiQueue.ts`)

**Singleton** managing API requests with:
- Request deduplication (same endpoint returns cached promise)
- Rate limiting (max 2 concurrent, 1s between batches)
- Exponential backoff retry (3 attempts)
- Circuit breaker (opens after 5 consecutive failures)

```typescript
import { apiQueue } from '../helper/apiQueue';

const result = await apiQueue.enqueue(
  'unique-key',
  () => axios.get('/endpoint'),
  { priority: 1 }
);
```

### 3. Batch Processor (`src/helper/batchProcessor.ts`)

```typescript
import { processBatch } from '../helper/batchProcessor';

const result = await processBatch({
  items: ticketcodes,
  processor: async (tc) => fetchTransaction(tc),
  concurrency: 2,
  delayBetweenBatches: 500,
  signal: abortController.signal,
});
```

---

## Navigation Structure

```
RootNavigator
├── AuthNavigator
│   └── LoginScreen (PIN entry)
└── AppNavigator (Bottom Tabs)
    ├── Home → Transaction entry, bet creation
    ├── History → Transaction history, sync
    ├── Result → Draw results, winners
    └── Setting → Printer setup, reset sync status, logout
        └── ResetStatus → Reset transaction sync status by date/draw
```

---

## Backend Integration (zian-api)

### Backend Location
```
../zian-api/         # Laravel 8+ API backend
```

### API Base URL Configuration
Configured in `src/config/appConfig.js`

### API Endpoints (v2)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v2/login` | POST | Employee authentication |
| `/v2/logout` | POST | Logout |
| `/v2/betTypes` | GET | Fetch bet type configurations |
| `/v2/soldOuts` | GET | Fetch sold-out combinations |
| `/v2/transactions` | POST | Submit new transaction |
| `/v2/transactions/bulk` | POST | Bulk fetch transactions |
| `/v2/transactions/bulk-sync` | POST | Bulk sync transactions |
| `/v2/transactions/scan/{ticketCode}` | GET | Scan/verify ticket |
| `/v2/transactions/{ticketCode}` | GET | Fetch single transaction |
| `/v2/transactions/checkBets` | POST | Validate bets against sold-outs |
| `/v2/results/{betTypeId}/draws/{draw}` | GET | Fetch draw result |
| `/v2/maintenance-schedule` | GET | Get maintenance schedules |

### Backend Models (Laravel)

| Model | Table | Purpose |
|-------|-------|---------|
| `Agent.php` | agents | Agent/outlet information |
| `Employee.php` | employees | App users (login) |
| `Transaction.php` | transactions | Bet transactions |
| `Bet.php` | bets | Individual bets |
| `Results.php` | results | Draw results |
| `Setting.php` | settings | System settings |
| `SoldOut.php` | sold_outs | Sold-out combinations |
| `MaintenanceSchedule.php` | maintenance_schedules | Maintenance windows |

### Backend Controllers

| Controller | Purpose |
|------------|---------|
| `AuthController` | Login/logout, token management |
| `TransactionController` | Transaction CRUD, bulk operations |
| `BetTypeController` | Bet type configurations |
| `ResultController` | Draw results |
| `SoldOutController` | Sold-out management |
| `MaintenanceScheduleController` | Maintenance schedules |

---

## API Services (`src/helper/api.ts`)

### ApiClient Class

```typescript
import { apiClient } from '../helper/api';

// Available methods
await apiClient.syncBetTypes(token);
await apiClient.getSoldOuts(token);
await apiClient.checkSoldOut(token, transData);
await apiClient.getTransactions(token, date, draw, type, keycode?);
await apiClient.sendTransaction(token, transaction);
await apiClient.getTransactionByTicketCode(token, ticketcode);
await apiClient.syncResult(token, type, draw, date);
await apiClient.checkTransaction(ticketcode, token);
await apiClient.getTransactionsBulk(token, ticketcodes);
await apiClient.sendTransactionsBulk(token, transactions);
await apiClient.getMaintenanceSchedule(token);
```

### Authentication Flow
1. Login with PIN → Receive token
2. Store token in Redux (persisted)
3. All API calls include `Authorization: Bearer {token}`
4. 401 response triggers automatic logout

---

## Architecture Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                         Redux Store                              │
│  (auth, types, soldouts, printer, combinationAmounts, etc.)     │
└────────────┬────────────────────────────────────────────────────┘
             │
┌────────────┴────────────────────────────────────────────────────┐
│                    Services Layer                                │
├─────────────────────┬───────────────────┬──────────────────────┤
│ DatabaseService     │ HistorySyncManager │ ApiClient           │
│ (SQLite CRUD)       │ (Sync orchestration)│ (HTTP requests)    │
└─────────────────────┴───────────────────┴──────────────────────┘
             │
┌────────────┴────────────────────────────────────────────────────┐
│              React Components & Screens                          │
└─────────────────────────────────────────────────────────────────┘
             │
┌────────────┴────────────────────────────────────────────────────┐
│                    Data Layer                                    │
├────────────────────────┬────────────────────────────────────────┤
│ SQLite (local)         │ REST API (zian-api backend)            │
│ - Offline-first        │ - Sync when online                     │
│ - Transaction storage  │ - Server validation                    │
└────────────────────────┴────────────────────────────────────────┘
```

---

## Common Patterns in This Project

### 1. Transaction Flow
```
Create transaction → Add bets → Calculate amounts → Print receipt → Sync to API
```

### 2. Offline-First Pattern
- All transactions stored locally first
- Background sync when online
- Reconciliation on History screen

### 3. Duplicate Detection
- Check by ticketcode (unique)
- Check by trans_data within 4 seconds

### 4. Reset Sync Status Feature
- Allows resetting transaction status from "synced" back to "printed"
- Filter by date and draw time (1st Draw 2PM, 2nd Draw 5PM, 3rd Draw 9PM)
- Preview transaction count before reset
- Useful for re-syncing transactions that failed to sync or were incorrectly marked as synced
- Accessible from Settings → Reset Sync Status

---

## CRITICAL: React Hooks Checklist

**When modifying any React component, ALWAYS verify:**

1. **Hook Imports**: Every hook used MUST be imported from React
2. **Ref Declarations**: Every `.current` access MUST have a corresponding `useRef()`
3. **Verification Steps**:
   - Check React import line includes ALL hooks used
   - Search for `.current` and verify each has matching `useRef()`

## CRITICAL: Service Method Verification

**When calling methods on service classes, ALWAYS verify:**

1. **Method Exists**: The method MUST exist on the service class
2. **Module Location**: Methods in `sqlite.ts` are NOT in `DatabaseService.ts`
3. **Verification Steps**:
   - Open the service class file
   - Search for the method name
   - If missing, ADD IT before using

---

## Code Quality Standards

### Naming Conventions
- Components: PascalCase (`TransactionScreen`)
- Functions/Variables: camelCase (`getTransactionById`)
- Constants: UPPER_SNAKE_CASE (`API_BASE_URL`)
- Types/Interfaces: PascalCase (`TransactionProps`)

### Performance Optimization
- Use `React.memo()` for stable props components
- Use `useCallback()` for functions passed as props
- Use `useMemo()` for expensive computations
- FlatList: `keyExtractor`, `getItemLayout`, `removeClippedSubviews`

### Styling
- Use `StyleSheet.create()` for all styles
- Use `wp()` and `hp()` for responsive design
- Extract colors to `Colors.ts`
- Avoid inline styles except dynamic values

---

## Anti-Patterns to Avoid

- Don't use inline functions in render
- Don't create objects/arrays in render
- Don't use `any` type unnecessarily
- Don't mutate state directly
- Don't forget cleanup in useEffect
- Don't commit console.logs in production
- Don't call service methods without verifying they exist
- Don't assume sqlite.ts methods exist in DatabaseService.ts

---

## Testing Standards

- Use Jest for testing
- Test utility functions in isolation
- Mock native modules appropriately
- Test all error scenarios

```
__tests__/
├── components/     # Component tests
├── store/          # Redux tests
└── helper/         # Utility function tests
```

---

## Summary Maintenance Rules

**Claude MUST update this file when ANY of these occur:**

| Change Type | Example | Action |
|-------------|---------|--------|
| New Redux reducer/action | Added `voicemail.reducer.ts` | Update Redux Store section |
| New SQLite table | Added `audit_log` table | Update Database section |
| New screen/navigation | Added `ReportsScreen` | Update Navigation Structure |
| New database method | Added `updateTransactionStatusByDateTime()` | Update DatabaseService Methods table |
| New API endpoint | Added bulk delete | Update API Endpoints section |
| New service | Added `printService.ts` | Update Services section |
| Directory structure change | New folder added | Update Directory Structure |

**Update format:**
1. Modify relevant section
2. Add entry to "Recent Changes" with date and brief description
3. Update "Last Updated" timestamp
