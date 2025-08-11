import SQLite, {ResultSetRowList} from 'react-native-sqlite-storage';
import {
  DatabaseConfig,
  DatabaseTransaction,
  ResultSet,
  DatabaseError,
} from './DatabaseTypes';
import {DATABASE_SCHEMA, INITIAL_DATA} from './DatabaseSchema';
import {SQLBuilder} from './SQLBuilder';
import {formatTime} from '../helper/functions';
import {checkIfDouble} from '../helper/functions';
import moment from 'moment';
import Type from '../models/Type';
import Bet from '../models/Bet';
import Transaction from '../models/Transaction';
import Result from '../models/Result';

export class DatabaseService {
  private db: SQLite.SQLiteDatabase;
  private static instance: DatabaseService;

  private constructor() {
    this.db = SQLite.openDatabase({name: 'zian.db', location: 'default'});
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async initializeDatabase(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        this.db.transaction(
          (tx: DatabaseTransaction) => {
            try {
              // Create tables
              Object.values(DATABASE_SCHEMA).forEach(tableSchema => {
                tx.executeSql(tableSchema.create);

                // Create indexes
                tableSchema.indexes.forEach(indexSql => {
                  tx.executeSql(indexSql);
                });
              });
            } catch (error) {
              console.error('Error creating tables:', error);
              reject(error);
            }
          },
          (error: DatabaseError) => {
            console.error('Transaction error during initialization:', error);
            reject(error);
          },
          () => {
            this.insertInitialData()
              .then(() => resolve(true))
              .catch(reject);
          },
        );
      } catch (error) {
        console.error('Error in database initialization:', error);
        reject(error);
      }
    });
  }

  private async insertInitialData(): Promise<void> {
    return new Promise((resolve, reject) => {
      const now = moment().format('YYYY-MM-DD HH:mm:ss');

      this.db.transaction(
        (tx: DatabaseTransaction) => {
          try {
            // Insert initial settings
            INITIAL_DATA.settings.forEach(setting => {
              const {sql, values} = SQLBuilder.insert('settings', setting);
              tx.executeSql(sql, values);
            });

            // Insert sample transaction
            const {sql: transSql, values: transValues} = SQLBuilder.insert(
              'trans',
              {
                ...INITIAL_DATA.sampleTransaction,
                created_at: now,
              },
            );
            tx.executeSql(transSql, transValues, (tx, results) => {
              const insertedId = results.insertId;

              // Insert sample bet
              const {sql: betSql, values: betValues} = SQLBuilder.insert(
                'bet',
                {
                  ...INITIAL_DATA.sampleBet,
                  transid: insertedId,
                },
              );
              tx.executeSql(betSql, betValues);
            });

            // Insert sample result
            const {sql: resultSql, values: resultValues} = SQLBuilder.insert(
              'result',
              {
                ...INITIAL_DATA.sampleResult,
                created_at: now,
              },
            );
            tx.executeSql(resultSql, resultValues);
          } catch (error) {
            console.error('Error inserting initial data:', error);
            reject(error);
          }
        },
        (error: DatabaseError) => {
          console.error(
            'Transaction error during initial data insertion:',
            error,
          );
          reject(error);
        },
        () => resolve(),
      );
    });
  }

  public async getActiveTypes(): Promise<Type[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        tx.executeSql(
          SQLBuilder.getActiveTypes(),
          [],
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            try {
              const rows = results.rows.raw();
              const types: Type[] = rows.map((row: any) => {
                const {
                  id,
                  bettype,
                  bettypeid,
                  limits,
                  capping,
                  wintar,
                  winram,
                  winram2,
                  start11,
                  start11m,
                  end11,
                  end11m,
                  start4,
                  start4m,
                  end4,
                  end4m,
                  start9,
                  start9m,
                  end9,
                  end9m,
                } = row;

                const draws = [
                  {
                    start: formatTime(start11, start11m),
                    end: formatTime(end11, end11m),
                  },
                  {
                    start: formatTime(start4, start4m),
                    end: formatTime(end4, end4m),
                  },
                  {
                    start: formatTime(start9, start9m),
                    end: formatTime(end9, end9m),
                  },
                ];

                return {
                  id: bettypeid,
                  bettypeid,
                  name: bettype,
                  limit: limits,
                  capping,
                  wintar,
                  winram,
                  winram2,
                  draws,
                };
              });

              resolve(types);
            } catch (error) {
              reject(error);
            }
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error('Error fetching active types:', error);
            reject(error);
          },
        );
      });
    });
  }

  public async getTransactions(
    betdate: string,
    bettime: number,
    bettypeid: number,
  ): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        tx.executeSql(
          SQLBuilder.getTransactionsByDateTime(betdate, bettime, bettypeid),
          [betdate, bettime, bettypeid],
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            try {
              const rows = results.rows;
              const transactions: any[] = [];

              for (let i = 0; i < rows.length; i++) {
                transactions.push(rows.item(i));
              }

              resolve(transactions);
            } catch (error) {
              reject(error);
            }
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error('Error fetching transactions:', error);
            reject(error);
          },
        );
      });
    });
  }

  public async getBetsByTransaction(transid: number): Promise<Bet[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        tx.executeSql(
          SQLBuilder.getBetsByTransaction(transid),
          [transid],
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            try {
              const rows = results.rows;
              const bets: Bet[] = [];

              for (let i = 0; i < rows.length; i++) {
                const row = rows.item(i);
                bets.push({
                  id: row.id,
                  transid: row.transid,
                  tranno: row.tranno,
                  betNumber: row.betnumber,
                  betNumberr: row.betnumberr,
                  targetAmount: row.target,
                  rambolAmount: row.rambol,
                  subtotal: row.subtotal,
                });
              }

              resolve(bets);
            } catch (error) {
              reject(error);
            }
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error('Error fetching bets:', error);
            reject(error);
          },
        );
      });
    });
  }

  public async insertTransaction(
    transaction: Transaction,
    bets: Bet[],
  ): Promise<number | null> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx: DatabaseTransaction) => {
          try {
            // Check for duplicate ticketcode
            tx.executeSql(
              SQLBuilder.checkDuplicateTransaction(transaction.ticketcode),
              [transaction.ticketcode],
              (tx: DatabaseTransaction, results: ResultSetRowList) => {
                if (results.rows.length > 0) {
                  console.log(
                    'Duplicate transaction detected (same ticketcode):',
                    transaction.ticketcode,
                  );
                  resolve(null);
                  return;
                }

                // Check for duplicate trans_data within 4 seconds
                tx.executeSql(
                  SQLBuilder.checkDuplicateTransactionData(
                    transaction.trans_data,
                    transaction.betdate,
                    transaction.bettime,
                    transaction.bettypeid,
                  ),
                  [
                    transaction.trans_data,
                    transaction.betdate,
                    transaction.bettime,
                    transaction.bettypeid,
                  ],
                  (tx: DatabaseTransaction, results: ResultSetRowList) => {
                    if (results.rows.length > 0) {
                      const lastCreatedAt = new Date(
                        results.rows.item(0).created_at,
                      ).getTime();
                      const currentCreatedAt = new Date(
                        transaction.created_at!,
                      ).getTime();
                      const timeDifference =
                        (currentCreatedAt - lastCreatedAt) / 1000;

                      if (timeDifference <= 4) {
                        console.log(
                          'Duplicate transaction detected (within 4 seconds):',
                          transaction.trans_data,
                        );
                        resolve(null);
                        return;
                      }
                    }

                    // Check and update trans_no if needed
                    tx.executeSql(
                      SQLBuilder.checkTransactionNumber(
                        transaction.trans_no,
                        transaction.betdate,
                        transaction.bettime,
                        transaction.bettypeid,
                      ),
                      [
                        transaction.trans_no,
                        transaction.betdate,
                        transaction.bettime,
                        transaction.bettypeid,
                      ],
                      (
                        tx: DatabaseTransaction,
                        transResults: ResultSetRowList,
                      ) => {
                        if (transResults.rows.length > 0) {
                          tx.executeSql(
                            SQLBuilder.updateTransactionNumbers(
                              transaction.trans_no,
                              transaction.betdate,
                              transaction.bettime,
                              transaction.bettypeid,
                            ),
                            [
                              transaction.trans_no,
                              transaction.betdate,
                              transaction.bettime,
                              transaction.bettypeid,
                            ],
                          );
                        }

                        // Insert the new transaction
                        const {sql, values} = SQLBuilder.insert('trans', {
                          ticketcode: transaction.ticketcode,
                          trans_data: transaction.trans_data,
                          betdate: transaction.betdate,
                          bettime: transaction.bettime,
                          bettypeid: transaction.bettypeid,
                          trans_no: transaction.trans_no,
                          total: transaction.total,
                          status: transaction.status,
                          created_at: transaction.created_at,
                        });

                        tx.executeSql(
                          sql,
                          values,
                          (
                            tx: DatabaseTransaction,
                            results: ResultSetRowList,
                          ) => {
                            const insertedId = results.insertId;
                            resolve(insertedId);

                            // Insert associated bets
                            bets.forEach((bet: Bet) => {
                              const {sql: betSql, values: betValues} =
                                SQLBuilder.insert('bet', {
                                  transid: insertedId,
                                  tranno: bet.tranno,
                                  betnumber: bet.betNumber,
                                  betnumberr: bet.betNumberr,
                                  target: bet.targetAmount,
                                  rambol: bet.rambolAmount,
                                  subtotal: bet.subtotal,
                                });
                              tx.executeSql(betSql, betValues);
                            });
                          },
                          (tx: DatabaseTransaction, error: DatabaseError) => {
                            console.error(
                              'Error inserting transaction:',
                              error,
                            );
                            reject(error);
                          },
                        );
                      },
                      (tx: DatabaseTransaction, error: DatabaseError) => {
                        console.error('Error checking trans_no:', error);
                        reject(error);
                      },
                    );
                  },
                  (tx: DatabaseTransaction, error: DatabaseError) => {
                    console.error(
                      'Error checking existing transaction by trans_data:',
                      error,
                    );
                    reject(error);
                  },
                );
              },
              (tx: DatabaseTransaction, error: DatabaseError) => {
                console.error(
                  'Error checking existing transaction by ticketcode:',
                  error,
                );
                reject(error);
              },
            );
          } catch (error) {
            reject(error);
          }
        },
        (error: DatabaseError) => {
          console.error('Transaction error during insertion:', error);
          reject(error);
        },
      );
    });
  }

  public async closeDatabase(): Promise<void> {
    return this.db.close();
  }
}

export default DatabaseService;
