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

export const getTotalUnsyncedCount = () =>
  DatabaseService.getInstance().getTotalUnsyncedCount();

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

// Maintenance schedule methods
export const saveMaintenanceSchedule = (schedule: {
  id?: number;
  start_time: string;
  end_time: string;
  reason?: string;
  is_active?: number;
}) => DatabaseService.getInstance().saveMaintenanceSchedule(schedule);

export const saveMaintenanceSchedules = (schedules: Array<{
  id?: number;
  start_time: string;
  end_time: string;
  reason?: string;
  is_active?: number;
}>) => DatabaseService.getInstance().saveMaintenanceSchedules(schedules);

export const getActiveMaintenanceSchedule = () =>
  DatabaseService.getInstance().getActiveMaintenanceSchedule();

export const getUpcomingMaintenanceSchedules = () =>
  DatabaseService.getInstance().getUpcomingMaintenanceSchedules();

export const isInMaintenancePeriod = () =>
  DatabaseService.getInstance().isInMaintenancePeriod();

// Migration method
export const runMigrations = () =>
  DatabaseService.getInstance().runMigrations();

// Optimized transaction and bet fetching methods
export const getTransactionsWithBets = (
  betdate: string,
  bettime: number,
  bettypeid: number,
) =>
  DatabaseService.getInstance().getTransactionsWithBets(
    betdate,
    bettime,
    bettypeid,
  );

export const getCombinationAmounts = (
  betdate: string,
  bettime: number,
  bettypeid: number,
  minutesAgo: number = 15,
) =>
  DatabaseService.getInstance().getCombinationAmounts(
    betdate,
    bettime,
    bettypeid,
    minutesAgo,
  );

export const getPOSCombinationAmounts = (
  betdate: string,
  bettime: number,
  bettypeid: number,
) =>
  DatabaseService.getInstance().getPOSCombinationAmounts(
    betdate,
    bettime,
    bettypeid,
  );

// Result and winner methods
export const getResult = (
  betdate: string,
  bettime: number,
  bettypeid: number,
) =>
  DatabaseService.getInstance().getResult(betdate, bettime, bettypeid);

export const getWinners = (betType: any, result: any) =>
  DatabaseService.getInstance().getWinners(betType, result);

export const getWinningTransactionBets = (
  transid: number,
  result: any,
) =>
  DatabaseService.getInstance().getWinningTransactionBets(transid, result);

// Delta sync optimized methods
export const getLocalTicketcodes = (
  betdate: string,
  bettime: number,
  bettypeid: number,
) =>
  DatabaseService.getInstance().getLocalTicketcodes(betdate, bettime, bettypeid);

export const getTransactionCount = (
  betdate: string,
  bettime: number,
  bettypeid: number,
) =>
  DatabaseService.getInstance().getTransactionCount(betdate, bettime, bettypeid);

export const getTransactionsSummary = (
  betdate: string,
  bettime: number,
  bettypeid: number,
) =>
  DatabaseService.getInstance().getTransactionsSummary(
    betdate,
    bettime,
    bettypeid,
  );

export const transactionExists = (ticketcode: string) =>
  DatabaseService.getInstance().transactionExists(ticketcode);

export const getExistingTicketcodes = (ticketcodes: string[]) =>
  DatabaseService.getInstance().getExistingTicketcodes(ticketcodes);

export const batchInsertTransactions = (
  transactions: Array<{
    ticketcode: string;
    betdate: string;
    bettime: number;
    bettypeid: number;
    total: number;
    status: string;
    trans_data: string;
    trans_no: number;
    created_at: string;
    bets: any[];
  }>,
) => DatabaseService.getInstance().batchInsertTransactions(transactions);