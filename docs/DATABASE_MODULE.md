# Database Module

This folder contains all database-related functionality for the BettingApp.

## Folder Structure

```
src/database/
├── README.md                 # This file
├── index.ts                  # Main export file
├── DatabaseTypes.ts          # TypeScript interfaces and constants
├── DatabaseSchema.ts         # Database table definitions and initial data
├── SQLBuilder.ts             # SQL query builder utility
├── DatabaseService.ts        # Main database service class
└── sqlite.ts                 # Legacy SQLite implementation (migration layer)
```

## Files Description

### `index.ts`

Main export file that provides access to all database functionality:

- Database types and interfaces
- Database service
- SQL builder utilities
- Legacy SQLite functions (for backward compatibility)

### `DatabaseTypes.ts`

Contains TypeScript interfaces and constants:

- Database configuration types
- Table and column constants
- Status values
- Index definitions

### `DatabaseSchema.ts`

Defines the database structure:

- Table creation SQL statements
- Index creation SQL statements
- Initial data for tables
- Sample data for testing

### `SQLBuilder.ts`

Utility class for building SQL queries:

- Parameterized query generation
- WHERE clause building
- Common query templates
- SQL injection prevention

### `DatabaseService.ts`

Main database service class:

- Singleton pattern for database connections
- High-level database operations
- Error handling and logging
- Transaction management

### `sqlite.ts`

Legacy SQLite implementation:

- Migration layer for backward compatibility
- Fallback implementation if DatabaseService fails
- Maintains existing function signatures

## Usage

### Basic Import

```typescript
import {DatabaseService} from './database';
```

### Using Database Service

```typescript
const dbService = DatabaseService.getInstance();
await dbService.initializeDatabase();
const types = await dbService.getActiveTypes();
```

### Using Legacy Functions (Backward Compatibility)

```typescript
import {getActiveTypes, insertTransaction} from './database';

const types = await getActiveTypes();
const result = await insertTransaction(transaction, bets);
```

### Using SQL Builder

```typescript
import {SQLBuilder} from './database';

const {sql, values} = SQLBuilder.select('users', ['id', 'name'], {active: 1});
```

## Migration Strategy

The database module uses a hybrid approach:

1. **Primary**: New `DatabaseService` methods
2. **Fallback**: Legacy SQLite implementation if needed
3. **Backward Compatibility**: All existing function signatures maintained

## Benefits

- **Type Safety**: Full TypeScript support
- **Security**: SQL injection prevention
- **Performance**: Optimized queries and indexing
- **Maintainability**: Centralized database logic
- **Flexibility**: Easy to extend and modify

## Future Enhancements

- Database migration support
- Connection pooling
- Query performance monitoring
- Database backup/restore functionality
- Advanced caching strategies
