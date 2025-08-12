// Database Models
export * from './DatabaseTypes';

// Database Services
export {default as DatabaseService} from './DatabaseService';

// Database Utilities
export {SQLBuilder} from './SQLBuilder';
export {DATABASE_SCHEMA, INITIAL_DATA} from './DatabaseSchema';
export {clearDatabase} from './clearDatabase';

// Legacy SQLite (for backward compatibility)
export * from './sqlite';

// Batch syncing methods - access through DatabaseService instance
import DatabaseService from './DatabaseService';

export const getUnsyncedTransactionsCount = (
  betdate: string,
  bettime: number,
  bettypeid: number,
) =>
  DatabaseService.getInstance().getUnsyncedTransactionsCount(
    betdate,
    bettime,
    bettypeid,
  );

export const getUnsyncedTransactionsBatch = (
  betdate: string,
  bettime: number,
  bettypeid: number,
  limit: number,
  offset: number,
) =>
  DatabaseService.getInstance().getUnsyncedTransactionsBatch(
    betdate,
    bettime,
    bettypeid,
    limit,
    offset,
  );

export const updateTransactionStatusBatch = (
  ticketcodes: string[],
  status: string,
) =>
  DatabaseService.getInstance().updateTransactionStatusBatch(
    ticketcodes,
    status,
  );

// Unsynced transaction checking methods
export const getUnsyncedTransactionsFromPreviousDraws = (
  currentDate: string,
  currentDraw: number,
) =>
  DatabaseService.getInstance().getUnsyncedTransactionsFromPreviousDraws(
    currentDate,
    currentDraw,
  );

export const getUnsyncedTransactionsSummary = () =>
  DatabaseService.getInstance().getUnsyncedTransactionsSummary();

// Database cleanup and optimization methods
export const getOldTransactionsForDeletion = (weeksOld: number = 1) =>
  DatabaseService.getInstance().getOldTransactionsForDeletion(weeksOld);

export const deleteOldTransactions = (weeksOld: number = 1) =>
  DatabaseService.getInstance().deleteOldTransactions(weeksOld);

export const deleteOldBets = (weeksOld: number = 1) =>
  DatabaseService.getInstance().deleteOldBets(weeksOld);

export const deleteOldResults = (weeksOld: number = 1) =>
  DatabaseService.getInstance().deleteOldResults(weeksOld);

export const cleanupOldData = (weeksOld: number = 1) =>
  DatabaseService.getInstance().cleanupOldData(weeksOld);

export const optimizeDatabase = () =>
  DatabaseService.getInstance().optimizeDatabase();
