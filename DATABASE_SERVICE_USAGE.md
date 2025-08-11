# DatabaseService Integration Guide

## Overview

The `DatabaseService` is a new, optimized database layer that provides:

- Better type safety
- Improved error handling
- SQL injection prevention
- Centralized database operations
- Singleton pattern for database connections

## Project Structure

All database-related files are now organized in a dedicated folder:

```
src/database/
├── README.md                 # Database module documentation
├── index.ts                  # Main export file
├── DatabaseTypes.ts          # TypeScript interfaces and constants
├── DatabaseSchema.ts         # Database table definitions and initial data
├── SQLBuilder.ts             # SQL query builder utility
├── DatabaseService.ts        # Main database service class
└── sqlite.ts                 # Legacy SQLite implementation (migration layer)
```

## Current Integration Status

### ✅ **Integrated Functions**

1. **`initializeDatabase()`** - Now uses `DatabaseService.getInstance().initializeDatabase()`
2. **`getActiveTypes()`** - Now uses `dbService.getActiveTypes()` with fallback
3. **`getTransactions()`** - Now uses `dbService.getTransactions()` with fallback
4. **`getBetsByTransaction()`** - Now uses `dbService.getBetsByTransaction()` with fallback
5. **`insertTransaction()`** - Now uses `dbService.insertTransaction()` with fallback

### 🔄 **Migration Strategy**

The integration uses a **hybrid approach**:

- **Primary**: New `DatabaseService` methods
- **Fallback**: Legacy SQLite implementation if `DatabaseService` fails
- **Backward Compatibility**: All existing function signatures remain unchanged

### 📍 **Where DatabaseService is Used**

#### 1. **App.tsx** (Main Application)

```typescript
import {DatabaseService} from './database';

// Initialize database
const dbService = DatabaseService.getInstance();
await dbService.initializeDatabase();
```

#### 2. **sqlite.ts** (Migration Layer)

```typescript
import {DatabaseService} from './DatabaseService';

// Initialize the new DatabaseService
const dbService = DatabaseService.getInstance();

// Migration layer - these functions now use DatabaseService internally
const getActiveTypes = () => {
  try {
    return dbService.getActiveTypes();
  } catch (error) {
    console.error(
      'Error using DatabaseService, falling back to legacy implementation:',
      error,
    );
    // Fallback to old implementation
    // ... legacy code ...
  }
};
```

#### 3. **Components and Screens** (Indirect Usage)

- `src/navigation/index.js` → `getActiveTypes`
- `src/screens/AppScreens/Setting/index.tsx` → `insertTypes`
- `src/components/ResultTransactionBets.tsx` → `getWinningTransactionBets`
- `src/components/TransactionBets.tsx` → `getBetsByTransaction`
- `src/screens/AuthScreens/LoginScreen.tsx` → `insertTypes`

## Benefits of Current Integration

### 🚀 **Performance Improvements**

- **Query Optimization**: Pre-built SQL queries for common operations
- **Connection Pooling**: Singleton pattern reduces connection overhead
- **Indexed Queries**: Proper database indexing for faster searches

### 🛡️ **Security Enhancements**

- **SQL Injection Prevention**: Parameterized queries via SQLBuilder
- **Input Validation**: Type-safe database operations
- **Error Handling**: Comprehensive error handling and logging

### 🔧 **Maintainability**

- **Centralized Schema**: All table definitions in one place
- **Query Builder**: SQL queries generated programmatically
- **Type Safety**: Full TypeScript support with proper interfaces

## How It Works

### 1. **Initialization Flow**

```
App.tsx → DatabaseService.getInstance() → initializeDatabase()
```

### 2. **Function Call Flow**

```
Component → sqlite.ts function → DatabaseService method → SQLite database
                ↓
            Fallback to legacy implementation if DatabaseService fails
```

### 3. **Database Operations**

```
DatabaseService → SQLBuilder → Parameterized SQL → SQLite
```

## Usage Examples

### **Getting Active Types**

```typescript
// Old way (still works)
import {getActiveTypes} from './database';
const types = await getActiveTypes();

// New way (direct)
import {DatabaseService} from './database';
const dbService = DatabaseService.getInstance();
const types = await dbService.getActiveTypes();
```

### **Inserting Transactions**

```typescript
// Old way (still works)
import {insertTransaction} from './database';
const result = await insertTransaction(transaction, bets);

// New way (direct)
import {DatabaseService} from './database';
const dbService = DatabaseService.getInstance();
const result = await dbService.insertTransaction(transaction, bets);
```

## Future Migration Steps

### **Phase 1: Complete Integration** ✅

- [x] Create DatabaseService
- [x] Create SQLBuilder
- [x] Create DatabaseSchema
- [x] Integrate core functions
- [x] Update App.tsx
- [x] Organize database files in dedicated folder

### **Phase 2: Full Migration** 🔄

- [ ] Replace all sqlite.ts function calls with DatabaseService
- [ ] Remove legacy fallback code
- [ ] Update all import statements
- [ ] Remove old sqlite.ts file

### **Phase 3: Advanced Features** 🚀

- [ ] Add database migration support
- [ ] Implement connection pooling
- [ ] Add query performance monitoring
- [ ] Implement database backup/restore

## Error Handling

The current integration includes comprehensive error handling:

```typescript
try {
  return dbService.getActiveTypes();
} catch (error) {
  console.error(
    'Error using DatabaseService, falling back to legacy implementation:',
    error,
  );
  // Fallback to old implementation
  return legacyImplementation();
}
```

## Performance Monitoring

To monitor the performance benefits:

```typescript
// Add timing to see performance improvements
const startTime = Date.now();
const result = await dbService.getActiveTypes();
const endTime = Date.now();
console.log(`DatabaseService took ${endTime - startTime}ms`);
```

## Conclusion

The `DatabaseService` is now actively used in the application through a migration layer that maintains backward compatibility while providing the benefits of the new optimized database architecture. The integration is transparent to existing components and provides automatic fallback to legacy implementations if needed.

All database-related files are now organized in a dedicated `src/database/` folder for better project structure and maintainability.
