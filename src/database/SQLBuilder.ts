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
}
