import {TABLES, COLUMNS, STATUS} from './DatabaseTypes';

export class SQLBuilder {
  private static buildWhereClause(conditions: Record<string, any>): {
    sql: string;
    values: any[];
  } {
    const clauses: string[] = [];
    const values: any[] = [];

    Object.entries(conditions).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        clauses.push(`${key} = ?`);
        values.push(value);
      }
    });

    return {
      sql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
      values,
    };
  }

  static createTable(tableName: string, columns: string[]): string {
    return `CREATE TABLE IF NOT EXISTS ${tableName} (${columns.join(', ')})`;
  }

  static createIndex(
    indexName: string,
    tableName: string,
    columns: string[],
  ): string {
    return `CREATE INDEX ${indexName} ON ${tableName} (${columns.join(', ')})`;
  }

  static select(
    tableName: string,
    columns: string[] = ['*'],
    conditions?: Record<string, any>,
  ): {sql: string; values: any[]} {
    const columnList = columns.join(', ');
    const {sql: whereClause, values} = this.buildWhereClause(conditions || {});
    const sql = `SELECT ${columnList} FROM ${tableName} ${whereClause}`.trim();

    return {sql, values};
  }

  static insert(
    tableName: string,
    data: Record<string, any>,
  ): {sql: string; values: any[]} {
    const columns = Object.keys(data);
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    const values = Object.values(data);

    return {sql, values};
  }

  static update(
    tableName: string,
    data: Record<string, any>,
    conditions: Record<string, any>,
  ): {sql: string; values: any[]} {
    const setClause = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');
    const {sql: whereClause, values: whereValues} =
      this.buildWhereClause(conditions);
    const sql = `UPDATE ${tableName} SET ${setClause} ${whereClause}`.trim();
    const values = [...Object.values(data), ...whereValues];

    return {sql, values};
  }

  static delete(
    tableName: string,
    conditions: Record<string, any>,
  ): {sql: string; values: any[]} {
    const {sql: whereClause, values} = this.buildWhereClause(conditions);
    const sql = `DELETE FROM ${tableName} ${whereClause}`.trim();

    return {sql, values};
  }

  // Specific query builders for common operations
  static getActiveTypes(): string {
    return `SELECT * FROM ${TABLES.SETTINGS} WHERE ${COLUMNS.SETTINGS.ACTIVE} = 1`;
  }

  static getTransactionsByDateTime(
    betdate: string,
    bettime: number,
    bettypeid: number,
  ): string {
    return `SELECT * FROM ${TABLES.TRANS} 
            WHERE ${COLUMNS.TRANS.BETDATE} = ? 
            AND ${COLUMNS.TRANS.BETTIME} = ? 
            AND ${COLUMNS.TRANS.BETTYPEID} = ? 
            ORDER BY ${COLUMNS.TRANS.TRANS_NO} ASC`;
  }

  static getBetsByTransaction(transid: number): string {
    return `SELECT * FROM ${TABLES.BET} WHERE ${COLUMNS.BET.TRANSID} = ?`;
  }

  static getResult(
    betdate: string,
    bettime: number,
    bettypeid: number,
  ): string {
    return `SELECT * FROM ${TABLES.RESULT} 
            WHERE ${COLUMNS.RESULT.BETDATE} = ? 
            AND ${COLUMNS.RESULT.BETTIME} = ? 
            AND ${COLUMNS.RESULT.BETTYPEID} = ?`;
  }

  static getWinners(betType: any, result: any): string {
    return `SELECT ${TABLES.TRANS}.${COLUMNS.TRANS.TICKETCODE}, 
                   ${TABLES.TRANS}.${COLUMNS.TRANS.ID}, 
                   ${TABLES.TRANS}.${COLUMNS.TRANS.STATUS}, 
                   ${TABLES.TRANS}.${COLUMNS.TRANS.CREATED_AT}, 
                   ${TABLES.TRANS}.${COLUMNS.TRANS.TRANS_NO}, 
                   sum(CASE WHEN ${TABLES.BET}.${COLUMNS.BET.BETNUMBER} = ? THEN (${TABLES.BET}.${COLUMNS.BET.TARGET} * ?) ELSE 0 END + 
                       CASE WHEN ${TABLES.BET}.${COLUMNS.BET.BETNUMBERR} = ? THEN (${TABLES.BET}.${COLUMNS.BET.RAMBOL} * ?) ELSE 0 END ) as total, 
                   sum(CASE WHEN ${TABLES.BET}.${COLUMNS.BET.BETNUMBER} = ? THEN (${TABLES.BET}.${COLUMNS.BET.TARGET} * ?) ELSE 0 END ) as targetTotal, 
                   sum(CASE WHEN ${TABLES.BET}.${COLUMNS.BET.BETNUMBERR} = ? THEN (${TABLES.BET}.${COLUMNS.BET.RAMBOL} * ?) ELSE 0 END ) as rambolTotal 
            FROM ${TABLES.BET} LEFT OUTER JOIN ${TABLES.TRANS} ON ${TABLES.BET}.${COLUMNS.BET.TRANSID} = ${TABLES.TRANS}.${COLUMNS.TRANS.ID} 
            WHERE ${TABLES.TRANS}.${COLUMNS.TRANS.BETDATE} = ? 
            AND ${TABLES.TRANS}.${COLUMNS.TRANS.BETTIME} = ? 
            AND ${TABLES.TRANS}.${COLUMNS.TRANS.BETTYPEID} = ? 
            AND ((${TABLES.BET}.${COLUMNS.BET.BETNUMBER} = ? AND ${TABLES.BET}.${COLUMNS.BET.TARGET}>0) 
                 OR (${TABLES.BET}.${COLUMNS.BET.BETNUMBERR} = ? AND ${TABLES.BET}.${COLUMNS.BET.RAMBOL}>0)) 
            GROUP BY ${TABLES.TRANS}.${COLUMNS.TRANS.TICKETCODE}`;
  }

  static checkDuplicateTransaction(ticketcode: string): string {
    return `SELECT ${COLUMNS.TRANS.ID} FROM ${TABLES.TRANS} WHERE ${COLUMNS.TRANS.TICKETCODE} = ?`;
  }

  static checkDuplicateTransactionData(
    trans_data: string,
    betdate: string,
    bettime: number,
    bettypeid: number,
  ): string {
    return `SELECT ${COLUMNS.TRANS.CREATED_AT} FROM ${TABLES.TRANS} 
            WHERE ${COLUMNS.TRANS.TRANS_DATA} = ? 
            AND ${COLUMNS.TRANS.BETDATE} = ? 
            AND ${COLUMNS.TRANS.BETTIME} = ? 
            AND ${COLUMNS.TRANS.BETTYPEID} = ? 
            ORDER BY ${COLUMNS.TRANS.CREATED_AT} DESC LIMIT 1`;
  }

  static checkTransactionNumber(
    trans_no: number,
    betdate: string,
    bettime: number,
    bettypeid: number,
  ): string {
    return `SELECT ${COLUMNS.TRANS.TRANS_NO} FROM ${TABLES.TRANS} 
            WHERE ${COLUMNS.TRANS.TRANS_NO} = ? 
            AND ${COLUMNS.TRANS.BETDATE} = ? 
            AND ${COLUMNS.TRANS.BETTIME} = ? 
            AND ${COLUMNS.TRANS.BETTYPEID} = ?`;
  }

  static updateTransactionNumbers(
    trans_no: number,
    betdate: string,
    bettime: number,
    bettypeid: number,
  ): string {
    return `UPDATE ${TABLES.TRANS} 
            SET ${COLUMNS.TRANS.TRANS_NO} = ${COLUMNS.TRANS.TRANS_NO} + 1 
            WHERE ${COLUMNS.TRANS.TRANS_NO} >= ? 
            AND ${COLUMNS.TRANS.BETDATE} = ? 
            AND ${COLUMNS.TRANS.BETTIME} = ? 
            AND ${COLUMNS.TRANS.BETTYPEID} = ?`;
  }

  // Batch syncing queries
  static getUnsyncedTransactionsCount(
    betdate: string,
    bettime: number,
    bettypeid: number,
  ): string {
    return `SELECT COUNT(*) as count FROM ${TABLES.TRANS} 
            WHERE ${COLUMNS.TRANS.BETDATE} = ? 
            AND ${COLUMNS.TRANS.BETTIME} = ? 
            AND ${COLUMNS.TRANS.BETTYPEID} = ? 
            AND ${COLUMNS.TRANS.STATUS} != 'synced'`;
  }

  static getUnsyncedTransactionsBatch(
    betdate: string,
    bettime: number,
    bettypeid: number,
    limit: number,
    offset: number,
  ): string {
    return `SELECT * FROM ${TABLES.TRANS} 
            WHERE ${COLUMNS.TRANS.BETDATE} = ? 
            AND ${COLUMNS.TRANS.BETTIME} = ? 
            AND ${COLUMNS.TRANS.BETTYPEID} = ? 
            AND ${COLUMNS.TRANS.STATUS} != 'synced'
            ORDER BY ${COLUMNS.TRANS.CREATED_AT} ASC
            LIMIT ? OFFSET ?`;
  }

  static updateTransactionStatusBatch(
    ticketcodes: string[],
    status: string,
  ): string {
    const placeholders = ticketcodes.map(() => '?').join(',');
    return `UPDATE ${TABLES.TRANS} 
            SET ${COLUMNS.TRANS.STATUS} = ? 
            WHERE ${COLUMNS.TRANS.TICKETCODE} IN (${placeholders})`;
  }

  // Check for unsynced transactions from previous draws
  static getUnsyncedTransactionsFromPreviousDraws(
    currentDate: string,
    currentDraw: number,
  ): string {
    return `SELECT 
              ${COLUMNS.TRANS.BETDATE},
              ${COLUMNS.TRANS.BETTIME},
              ${COLUMNS.TRANS.BETTYPEID},
              COUNT(*) as unsynced_count
            FROM ${TABLES.TRANS} 
            WHERE ${COLUMNS.TRANS.STATUS} != 'synced'
              AND (
                ${COLUMNS.TRANS.BETDATE} < ? 
                OR (${COLUMNS.TRANS.BETDATE} = ? AND ${COLUMNS.TRANS.BETTIME} < ?)
              )
            GROUP BY ${COLUMNS.TRANS.BETDATE}, ${COLUMNS.TRANS.BETTIME}, ${COLUMNS.TRANS.BETTYPEID}
            ORDER BY ${COLUMNS.TRANS.BETDATE} DESC, ${COLUMNS.TRANS.BETTIME} DESC`;
  }

  static getUnsyncedTransactionsSummary(): string {
    return `SELECT 
              ${COLUMNS.TRANS.BETDATE},
              ${COLUMNS.TRANS.BETTIME},
              ${COLUMNS.TRANS.BETTYPEID},
              COUNT(*) as unsynced_count,
              SUM(${COLUMNS.TRANS.TOTAL}) as total_amount
            FROM ${TABLES.TRANS} 
            WHERE ${COLUMNS.TRANS.STATUS} != 'synced'
            GROUP BY ${COLUMNS.TRANS.BETDATE}, ${COLUMNS.TRANS.BETTIME}, ${COLUMNS.TRANS.BETTYPEID}
            ORDER BY ${COLUMNS.TRANS.BETDATE} DESC, ${COLUMNS.TRANS.BETTIME} DESC`;
  }

  /**
   * Get total count of ALL unsynced transactions (regardless of date/draw/type)
   */
  static getTotalUnsyncedCount(): string {
    return `SELECT COUNT(*) as total_unsynced
            FROM ${TABLES.TRANS} 
            WHERE ${COLUMNS.TRANS.STATUS} != 'synced'`;
  }

  // Improved transaction deletion queries
  static getOldTransactionsForDeletion(weeksOld: number = 1): string {
    return `SELECT 
              ${COLUMNS.TRANS.ID},
              ${COLUMNS.TRANS.TICKETCODE},
              ${COLUMNS.TRANS.BETDATE},
              ${COLUMNS.TRANS.CREATED_AT},
              ${COLUMNS.TRANS.STATUS}
            FROM ${TABLES.TRANS} 
            WHERE (
              ${COLUMNS.TRANS.BETDATE} < date('now', '-${weeksOld} weeks')
              OR ${COLUMNS.TRANS.CREATED_AT} < datetime('now', '-${weeksOld} weeks')
            )
            AND ${COLUMNS.TRANS.STATUS} = 'synced'
            ORDER BY ${COLUMNS.TRANS.CREATED_AT} ASC`;
  }

  static deleteOldTransactions(weeksOld: number = 1): string {
    return `DELETE FROM ${TABLES.TRANS} 
            WHERE (
              ${COLUMNS.TRANS.BETDATE} < date('now', '-${weeksOld} weeks')
              OR ${COLUMNS.TRANS.CREATED_AT} < datetime('now', '-${weeksOld} weeks')
            )
            AND ${COLUMNS.TRANS.STATUS} = 'synced'`;
  }

  static deleteOldBets(weeksOld: number = 1): string {
    return `DELETE FROM ${TABLES.BET} 
            WHERE ${COLUMNS.BET.CREATED_AT} < date('now', '-${weeksOld} weeks')`;
  }

  static deleteOldResults(weeksOld: number = 1): string {
    return `DELETE FROM ${TABLES.RESULT} 
            WHERE ${COLUMNS.RESULT.CREATED_AT} < date('now', '-${weeksOld} weeks')`;
  }

  // Database maintenance queries
  static vacuumDatabase(): string {
    return 'VACUUM';
  }

  static analyzeDatabase(): string {
    return 'ANALYZE';
  }

  static reindexDatabase(): string {
    return 'REINDEX';
  }

  // Optimized queries for transaction and bet fetching
  /**
   * Get transactions with their bets in a single JOIN query
   * This eliminates N+1 query problem
   */
  static getTransactionsWithBets(
    betdate: string,
    bettime: number,
    bettypeid: number,
  ): string {
    return `SELECT 
              ${TABLES.TRANS}.${COLUMNS.TRANS.ID} as trans_id,
              ${TABLES.TRANS}.${COLUMNS.TRANS.TICKETCODE},
              ${TABLES.TRANS}.${COLUMNS.TRANS.BETDATE},
              ${TABLES.TRANS}.${COLUMNS.TRANS.BETTIME},
              ${TABLES.TRANS}.${COLUMNS.TRANS.BETTYPEID},
              ${TABLES.TRANS}.${COLUMNS.TRANS.TRANS_NO},
              ${TABLES.TRANS}.${COLUMNS.TRANS.TOTAL},
              ${TABLES.TRANS}.${COLUMNS.TRANS.TRANS_DATA},
              ${TABLES.TRANS}.${COLUMNS.TRANS.STATUS},
              ${TABLES.TRANS}.${COLUMNS.TRANS.CREATED_AT},
              ${TABLES.BET}.${COLUMNS.BET.ID} as bet_id,
              ${TABLES.BET}.${COLUMNS.BET.TRANSID},
              ${TABLES.BET}.${COLUMNS.BET.TRANNO},
              ${TABLES.BET}.${COLUMNS.BET.BETNUMBER},
              ${TABLES.BET}.${COLUMNS.BET.BETNUMBERR},
              ${TABLES.BET}.${COLUMNS.BET.TARGET},
              ${TABLES.BET}.${COLUMNS.BET.RAMBOL},
              ${TABLES.BET}.${COLUMNS.BET.SUBTOTAL}
            FROM ${TABLES.TRANS}
            LEFT JOIN ${TABLES.BET} ON ${TABLES.TRANS}.${COLUMNS.TRANS.ID} = ${TABLES.BET}.${COLUMNS.BET.TRANSID}
            WHERE ${TABLES.TRANS}.${COLUMNS.TRANS.BETDATE} = ?
              AND ${TABLES.TRANS}.${COLUMNS.TRANS.BETTIME} = ?
              AND ${TABLES.TRANS}.${COLUMNS.TRANS.BETTYPEID} = ?
            ORDER BY ${TABLES.TRANS}.${COLUMNS.TRANS.TRANS_NO} ASC, ${TABLES.BET}.${COLUMNS.BET.TRANNO} ASC`;
  }

  /**
   * Get combination amounts aggregated directly in SQL (for 15-minute window)
   * This calculates target and rambol amounts grouped by bet number
   */
  static getCombinationAmounts(
    betdate: string,
    bettime: number,
    bettypeid: number,
    minutesAgo: number = 15,
  ): string {
    return `SELECT 
              CAST(${bettypeid} AS TEXT) || '_' || CAST(${bettime} AS TEXT) || '_target_' || ${TABLES.BET}.${COLUMNS.BET.BETNUMBER} as key,
              SUM(${TABLES.BET}.${COLUMNS.BET.TARGET}) as amount
            FROM ${TABLES.TRANS}
            INNER JOIN ${TABLES.BET} ON ${TABLES.TRANS}.${COLUMNS.TRANS.ID} = ${TABLES.BET}.${COLUMNS.BET.TRANSID}
            WHERE ${TABLES.TRANS}.${COLUMNS.TRANS.BETDATE} = ?
              AND ${TABLES.TRANS}.${COLUMNS.TRANS.BETTIME} = ?
              AND ${TABLES.TRANS}.${COLUMNS.TRANS.BETTYPEID} = ?
              AND ${TABLES.BET}.${COLUMNS.BET.TARGET} > 0
              AND datetime(${TABLES.TRANS}.${COLUMNS.TRANS.CREATED_AT}) >= datetime('now', '-${minutesAgo} minutes')
            GROUP BY ${TABLES.BET}.${COLUMNS.BET.BETNUMBER}
            
            UNION ALL
            
            SELECT 
              CAST(${bettypeid} AS TEXT) || '_' || CAST(${bettime} AS TEXT) || '_rambol_' || ${TABLES.BET}.${COLUMNS.BET.BETNUMBERR} as key,
              SUM(${TABLES.BET}.${COLUMNS.BET.RAMBOL}) as amount
            FROM ${TABLES.TRANS}
            INNER JOIN ${TABLES.BET} ON ${TABLES.TRANS}.${COLUMNS.TRANS.ID} = ${TABLES.BET}.${COLUMNS.BET.TRANSID}
            WHERE ${TABLES.TRANS}.${COLUMNS.TRANS.BETDATE} = ?
              AND ${TABLES.TRANS}.${COLUMNS.TRANS.BETTIME} = ?
              AND ${TABLES.TRANS}.${COLUMNS.TRANS.BETTYPEID} = ?
              AND ${TABLES.BET}.${COLUMNS.BET.RAMBOL} > 0
              AND datetime(${TABLES.TRANS}.${COLUMNS.TRANS.CREATED_AT}) >= datetime('now', '-${minutesAgo} minutes')
            GROUP BY ${TABLES.BET}.${COLUMNS.BET.BETNUMBERR}`;
  }

  /**
   * Get POS combination amounts aggregated directly in SQL (for entire draw)
   * This calculates target and rambol amounts grouped by bet number for the entire draw
   */
  static getPOSCombinationAmounts(
    betdate: string,
    bettime: number,
    bettypeid: number,
  ): string {
    return `SELECT 
              CAST(${bettypeid} AS TEXT) || '_' || CAST(${bettime} AS TEXT) || '_target_' || ${TABLES.BET}.${COLUMNS.BET.BETNUMBER} as key,
              SUM(${TABLES.BET}.${COLUMNS.BET.TARGET}) as amount
            FROM ${TABLES.TRANS}
            INNER JOIN ${TABLES.BET} ON ${TABLES.TRANS}.${COLUMNS.TRANS.ID} = ${TABLES.BET}.${COLUMNS.BET.TRANSID}
            WHERE ${TABLES.TRANS}.${COLUMNS.TRANS.BETDATE} = ?
              AND ${TABLES.TRANS}.${COLUMNS.TRANS.BETTIME} = ?
              AND ${TABLES.TRANS}.${COLUMNS.TRANS.BETTYPEID} = ?
              AND ${TABLES.BET}.${COLUMNS.BET.TARGET} > 0
            GROUP BY ${TABLES.BET}.${COLUMNS.BET.BETNUMBER}
            
            UNION ALL
            
            SELECT 
              CAST(${bettypeid} AS TEXT) || '_' || CAST(${bettime} AS TEXT) || '_rambol_' || ${TABLES.BET}.${COLUMNS.BET.BETNUMBERR} as key,
              SUM(${TABLES.BET}.${COLUMNS.BET.RAMBOL}) as amount
            FROM ${TABLES.TRANS}
            INNER JOIN ${TABLES.BET} ON ${TABLES.TRANS}.${COLUMNS.TRANS.ID} = ${TABLES.BET}.${COLUMNS.BET.TRANSID}
            WHERE ${TABLES.TRANS}.${COLUMNS.TRANS.BETDATE} = ?
              AND ${TABLES.TRANS}.${COLUMNS.TRANS.BETTIME} = ?
              AND ${TABLES.TRANS}.${COLUMNS.TRANS.BETTYPEID} = ?
              AND ${TABLES.BET}.${COLUMNS.BET.RAMBOL} > 0
            GROUP BY ${TABLES.BET}.${COLUMNS.BET.BETNUMBERR}`;
  }

  // ============================================================================
  // Delta Sync Optimized Queries
  // ============================================================================

  /**
   * Get all ticketcodes for a specific draw (for delta comparison)
   */
  static getLocalTicketcodes(
    betdate: string,
    bettime: number,
    bettypeid: number,
  ): string {
    return `SELECT ${COLUMNS.TRANS.TICKETCODE} 
            FROM ${TABLES.TRANS} 
            WHERE ${COLUMNS.TRANS.BETDATE} = ? 
              AND ${COLUMNS.TRANS.BETTIME} = ? 
              AND ${COLUMNS.TRANS.BETTYPEID} = ?`;
  }

  /**
   * Get transaction count for quick comparison
   */
  static getTransactionCount(
    betdate: string,
    bettime: number,
    bettypeid: number,
  ): string {
    return `SELECT COUNT(*) as count 
            FROM ${TABLES.TRANS} 
            WHERE ${COLUMNS.TRANS.BETDATE} = ? 
              AND ${COLUMNS.TRANS.BETTIME} = ? 
              AND ${COLUMNS.TRANS.BETTYPEID} = ?`;
  }

  /**
   * Get transactions with stats for sync summary
   */
  static getTransactionsSummary(
    betdate: string,
    bettime: number,
    bettypeid: number,
  ): string {
    return `SELECT 
              COUNT(*) as total_count,
              SUM(${COLUMNS.TRANS.TOTAL}) as total_amount,
              SUM(CASE WHEN ${COLUMNS.TRANS.STATUS} = 'synced' THEN 1 ELSE 0 END) as synced_count,
              SUM(CASE WHEN ${COLUMNS.TRANS.STATUS} != 'synced' THEN 1 ELSE 0 END) as unsynced_count,
              MAX(${COLUMNS.TRANS.CREATED_AT}) as last_transaction_time
            FROM ${TABLES.TRANS} 
            WHERE ${COLUMNS.TRANS.BETDATE} = ? 
              AND ${COLUMNS.TRANS.BETTIME} = ? 
              AND ${COLUMNS.TRANS.BETTYPEID} = ?`;
  }

  /**
   * Check if a transaction exists by ticketcode (optimized single lookup)
   */
  static transactionExists(ticketcode: string): string {
    return `SELECT 1 FROM ${TABLES.TRANS} 
            WHERE ${COLUMNS.TRANS.TICKETCODE} = ? 
            LIMIT 1`;
  }

  /**
   * Bulk check for existing ticketcodes (for batch insert optimization)
   */
  static getExistingTicketcodes(ticketcodes: string[]): string {
    const placeholders = ticketcodes.map(() => '?').join(',');
    return `SELECT ${COLUMNS.TRANS.TICKETCODE} 
            FROM ${TABLES.TRANS} 
            WHERE ${COLUMNS.TRANS.TICKETCODE} IN (${placeholders})`;
  }

  /**
   * Get transactions that need to be uploaded (unsynced)
   */
  static getTransactionsToUpload(
    betdate: string,
    bettime: number,
    bettypeid: number,
    limit: number = 50,
  ): string {
    return `SELECT t.*, 
              (SELECT GROUP_CONCAT(b.${COLUMNS.BET.ID}) 
               FROM ${TABLES.BET} b 
               WHERE b.${COLUMNS.BET.TRANSID} = t.${COLUMNS.TRANS.ID}) as bet_ids
            FROM ${TABLES.TRANS} t
            WHERE t.${COLUMNS.TRANS.BETDATE} = ? 
              AND t.${COLUMNS.TRANS.BETTIME} = ? 
              AND t.${COLUMNS.TRANS.BETTYPEID} = ? 
              AND t.${COLUMNS.TRANS.STATUS} != 'synced'
            ORDER BY t.${COLUMNS.TRANS.CREATED_AT} ASC
            LIMIT ?`;
  }

  /**
   * Upsert transaction (insert or update based on ticketcode)
   * Note: SQLite doesn't support ON CONFLICT DO UPDATE on all versions,
   * so we use INSERT OR REPLACE
   */
  static upsertTransaction(): string {
    return `INSERT OR REPLACE INTO ${TABLES.TRANS} (
              ${COLUMNS.TRANS.TICKETCODE},
              ${COLUMNS.TRANS.BETDATE},
              ${COLUMNS.TRANS.BETTIME},
              ${COLUMNS.TRANS.BETTYPEID},
              ${COLUMNS.TRANS.TOTAL},
              ${COLUMNS.TRANS.STATUS},
              ${COLUMNS.TRANS.TRANS_DATA},
              ${COLUMNS.TRANS.TRANS_NO},
              ${COLUMNS.TRANS.CREATED_AT}
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  }
}
