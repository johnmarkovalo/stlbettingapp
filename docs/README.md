# BettingApp Documentation

Welcome to the BettingApp documentation! This folder contains comprehensive documentation for all major features, optimizations, and integrations.

## 📚 Documentation Index

### Core Features

- **[HISTORY_SYNC.md](./HISTORY_SYNC.md)** - Complete guide to the History Sync feature
  - Architecture and state machine
  - Data flow and reconciliation
  - API endpoints and database schema
  - Error handling and troubleshooting
  - Usage examples

- **[TRANSAC_SCREEN.md](./TRANSAC_SCREEN.md)** - TransacScreen optimization documentation
  - Custom hooks (useInputReducer, useSoldoutChecker)
  - Dirty flag data fetching pattern
  - Soldout validation hierarchy
  - Input flow and auto-focus logic
  - Performance optimizations

- **[OPTIMIZATIONS.md](./OPTIMIZATIONS.md)** - Performance optimizations and improvements
  - Database query optimizations (N+1 fixes, SQL aggregation)
  - API Queue system (rate limiting, deduplication, circuit breaker)
  - Batch processing utilities
  - Performance impact metrics

### System Integrations

- **[UPDATE_SYSTEM.md](./UPDATE_SYSTEM.md)** - App update system documentation
  - Automatic update checks
  - Silent background downloads
  - Force update mechanism
  - Laravel API integration
  - Troubleshooting guide

- **[NYX_PRINTER.md](./NYX_PRINTER.md)** - Nyx Printer module documentation
  - Printer API reference
  - Usage examples
  - Scanner integration
  - LCD display control
  - Cash drawer control

### Database

- **[DATABASE_MODULE.md](./DATABASE_MODULE.md)** - Database module overview
  - Folder structure
  - File descriptions
  - Usage patterns
  - Migration strategy

- **[DATABASE_SERVICE_USAGE.md](./DATABASE_SERVICE_USAGE.md)** - DatabaseService integration guide
  - Integration status
  - Migration strategy
  - Usage examples
  - Performance benefits
  - Future migration steps

## 🗂️ Quick Reference

### For New Developers

1. Start with **[OPTIMIZATIONS.md](./OPTIMIZATIONS.md)** to understand the architecture
2. Read **[HISTORY_SYNC.md](./HISTORY_SYNC.md)** for sync feature details
3. Check **[DATABASE_MODULE.md](./DATABASE_MODULE.md)** for database structure
4. Review **[TRANSAC_SCREEN.md](./TRANSAC_SCREEN.md)** for transaction screen patterns

### For Feature Development

- **Transaction Screen**: See [TRANSAC_SCREEN.md](./TRANSAC_SCREEN.md)
- **Sync Features**: See [HISTORY_SYNC.md](./HISTORY_SYNC.md)
- **Database Operations**: See [DATABASE_SERVICE_USAGE.md](./DATABASE_SERVICE_USAGE.md)
- **Performance**: See [OPTIMIZATIONS.md](./OPTIMIZATIONS.md)

### For Troubleshooting

- **Sync Issues**: [HISTORY_SYNC.md - Troubleshooting](./HISTORY_SYNC.md#troubleshooting)
- **Update Issues**: [UPDATE_SYSTEM.md - Troubleshooting](./UPDATE_SYSTEM.md#-troubleshooting)
- **Performance Issues**: [OPTIMIZATIONS.md - Debugging Tips](./OPTIMIZATIONS.md#debugging-tips)

## 📖 Documentation Standards

All documentation in this folder follows these standards:

- **Clear Structure**: Table of contents, sections, and subsections
- **Code Examples**: TypeScript/JavaScript examples with context
- **Visual Aids**: Diagrams, tables, and flowcharts where helpful
- **Troubleshooting**: Common issues and solutions
- **API Reference**: Complete method signatures and parameters

## 🔄 Keeping Documentation Updated

When making significant changes:

1. Update the relevant documentation file
2. Update this README if adding new docs
3. Update `.cursorrules` if architecture changes
4. Add migration notes if breaking changes

## 📝 Contributing

When adding new features:

1. Create documentation in this folder
2. Follow existing documentation structure
3. Include code examples
4. Add troubleshooting section
5. Update this README index

---

**Last Updated**: January 2026
