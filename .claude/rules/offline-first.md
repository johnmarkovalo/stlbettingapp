---
paths:
  - "src/database/**/*.ts"
  - "src/services/**/*.ts"
  - "src/helper/api.ts"
---

# Offline-First Architecture

BettingApp uses offline-first architecture with SQLite.

## Transaction Flow

1. **Create locally** - Store in SQLite with status `null`
2. **Print receipt** - Update status to `'printed'`
3. **Sync to server** - POST to zian-api, update to `'synced'`

## Transaction Status Values

| Status | Meaning |
|--------|---------|
| `null` | Just created, not printed |
| `'printed'` | Printed but not synced |
| `'synced'` | Successfully synced to server |

## Sync Rules

- Never delete local transactions until confirmed synced
- Use `ticketcode` as unique identifier
- Implement retry logic with exponential backoff
- Validate server response before marking as synced

## Database Tables

- `trans` - Local transactions
- `bet` - Individual bets
- `result` - Cached draw results
- `settings` - App settings
