import SQLite, {ResultSetRowList} from 'react-native-sqlite-storage';
import {
  DatabaseConfig,
  DatabaseTransaction,
  ResultSet,
  DatabaseError,
  TABLES,
  COLUMNS,
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
              .then(() => {
                // Run migrations for existing databases
                return this.runMigrations();
              })
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

  /**
   * Run database migrations for existing databases
   * This ensures new tables are created even if database was initialized before
   * Can be called independently to update existing databases
   */
  public async runMigrations(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx: DatabaseTransaction) => {
          try {
            // Migration: Create maintenance_schedule table if it doesn't exist
            // Check if table exists by querying sqlite_master
            tx.executeSql(
              `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
              [TABLES.MAINTENANCE_SCHEDULE],
              (tx: DatabaseTransaction, results: ResultSetRowList) => {
                if (results.rows.length === 0) {
                  // Table doesn't exist, create it
                  console.log('🔄 Creating maintenance_schedule table...');
                  try {
                    const schema = DATABASE_SCHEMA[TABLES.MAINTENANCE_SCHEDULE];
                    if (schema) {
                      tx.executeSql(schema.create);
                      
                      // Create indexes
                      schema.indexes.forEach(indexSql => {
                        try {
                          tx.executeSql(indexSql);
                        } catch (indexError) {
                          // Index might already exist, ignore error
                          console.log('Index creation skipped (may already exist)');
                        }
                      });
                      console.log('✅ maintenance_schedule table created successfully');
                    }
                  } catch (createError) {
                    console.error('Error creating maintenance_schedule table:', createError);
                  }
                } else {
                  console.log('✅ maintenance_schedule table already exists');
                }
              },
              (tx: DatabaseTransaction, error: DatabaseError) => {
                // If query fails, try to create the table anyway using IF NOT EXISTS
                console.log('🔄 Attempting to create maintenance_schedule table...');
                try {
                  const schema = DATABASE_SCHEMA[TABLES.MAINTENANCE_SCHEDULE];
                  if (schema) {
                    // Use CREATE TABLE IF NOT EXISTS - safe to run multiple times
                    tx.executeSql(schema.create);
                    
                    // Create indexes (with IF NOT EXISTS equivalent by catching errors)
                    schema.indexes.forEach(indexSql => {
                      try {
                        tx.executeSql(indexSql);
                      } catch (indexError) {
                        // Index might already exist, ignore error
                        console.log('Index creation skipped (may already exist)');
                      }
                    });
                    console.log('✅ maintenance_schedule table created successfully');
                  }
                } catch (createError) {
                  console.error('Error creating maintenance_schedule table:', createError);
                }
              },
            );
          } catch (error) {
            console.error('Error running migrations:', error);
          }
        },
        (error: DatabaseError) => {
          console.error('Transaction error during migrations:', error);
          // Don't reject - migrations should not block app startup
        },
        () => {
          // Migration completed
          resolve();
        },
      );
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
              // Use rows.raw() for better performance
              const transactions = results.rows.raw();
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

  /**
   * Optimized method to get transactions with their bets in a single query
   * This eliminates N+1 query problem by using JOIN
   * Returns: { transactions: Transaction[], betsByTransaction: Record<number, Bet[]> }
   */
  public async getTransactionsWithBets(
    betdate: string,
    bettime: number,
    bettypeid: number,
  ): Promise<{
    transactions: any[];
    betsByTransaction: Record<number, any[]>;
  }> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        tx.executeSql(
          SQLBuilder.getTransactionsWithBets(betdate, bettime, bettypeid),
          [betdate, bettime, bettypeid],
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            try {
              const rows = results.rows.raw();
              const transactionsMap = new Map<number, any>();
              const betsByTransaction: Record<number, any[]> = {};

              // Process joined results
              rows.forEach((row: any) => {
                const transId = row.trans_id;

                // Build transaction object (only once per transaction)
                if (!transactionsMap.has(transId)) {
                  transactionsMap.set(transId, {
                    id: row.trans_id,
                    ticketcode: row.ticketcode,
                    betdate: row.betdate,
                    bettime: row.bettime,
                    bettypeid: row.bettypeid,
                    trans_no: row.trans_no,
                    total: row.total,
                    trans_data: row.trans_data,
                    status: row.status,
                    created_at: row.created_at,
                  });
                }

                // Add bet if it exists (bet_id will be null if transaction has no bets)
                if (row.bet_id) {
                  if (!betsByTransaction[transId]) {
                    betsByTransaction[transId] = [];
                  }
                  betsByTransaction[transId].push({
                    id: row.bet_id,
                    transid: row.transid,
                    tranno: row.tranno,
                    betNumber: row.betnumber,
                    betNumberr: row.betnumberr,
                    targetAmount: row.target,
                    rambolAmount: row.rambol,
                    subtotal: row.subtotal,
                  });
                }
              });

              resolve({
                transactions: Array.from(transactionsMap.values()),
                betsByTransaction,
              });
            } catch (error) {
              reject(error);
            }
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error('Error fetching transactions with bets:', error);
            reject(error);
          },
        );
      });
    });
  }

  /**
   * Get combination amounts directly from SQL aggregation (optimized)
   * Returns aggregated amounts for 15-minute window
   */
  public async getCombinationAmounts(
    betdate: string,
    bettime: number,
    bettypeid: number,
    minutesAgo: number = 15,
  ): Promise<Record<string, number>> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        tx.executeSql(
          SQLBuilder.getCombinationAmounts(
            betdate,
            bettime,
            bettypeid,
            minutesAgo,
          ),
          [
            betdate,
            bettime,
            bettypeid,
            betdate,
            bettime,
            bettypeid,
          ],
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            try {
              const rows = results.rows.raw();
              const amounts: Record<string, number> = {};

              rows.forEach((row: any) => {
                amounts[row.key] = (amounts[row.key] || 0) + row.amount;
              });

              resolve(amounts);
            } catch (error) {
              reject(error);
            }
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error('Error fetching combination amounts:', error);
            reject(error);
          },
        );
      });
    });
  }

  /**
   * Get POS combination amounts directly from SQL aggregation (optimized)
   * Returns aggregated amounts for entire draw
   */
  public async getPOSCombinationAmounts(
    betdate: string,
    bettime: number,
    bettypeid: number,
  ): Promise<Record<string, number>> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        tx.executeSql(
          SQLBuilder.getPOSCombinationAmounts(betdate, bettime, bettypeid),
          [
            betdate,
            bettime,
            bettypeid,
            betdate,
            bettime,
            bettypeid,
          ],
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            try {
              const rows = results.rows.raw();
              const amounts: Record<string, number> = {};

              rows.forEach((row: any) => {
                amounts[row.key] = (amounts[row.key] || 0) + row.amount;
              });

              resolve(amounts);
            } catch (error) {
              reject(error);
            }
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error('Error fetching POS combination amounts:', error);
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
              // Use rows.raw() for better performance
              const rows = results.rows.raw();
              const bets: Bet[] = rows.map((row: any) => ({
                id: row.id,
                transid: row.transid,
                tranno: row.tranno,
                betNumber: row.betnumber,
                betNumberr: row.betnumberr,
                targetAmount: row.target,
                rambolAmount: row.rambol,
                subtotal: row.subtotal,
              }));

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

  // Batch syncing methods
  public async getUnsyncedTransactionsCount(
    betdate: string,
    bettime: number,
    bettypeid: number,
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        tx.executeSql(
          SQLBuilder.getUnsyncedTransactionsCount(betdate, bettime, bettypeid),
          [betdate, bettime, bettypeid],
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            try {
              const count = results.rows.item(0).count;
              resolve(count);
            } catch (error) {
              reject(error);
            }
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error('Error getting unsynced count:', error);
            reject(error);
          },
        );
      });
    });
  }

  public async getUnsyncedTransactionsBatch(
    betdate: string,
    bettime: number,
    bettypeid: number,
    limit: number,
    offset: number,
  ): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        tx.executeSql(
          SQLBuilder.getUnsyncedTransactionsBatch(
            betdate,
            bettime,
            bettypeid,
            limit,
            offset,
          ),
          [betdate, bettime, bettypeid, limit, offset],
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            try {
              // Use rows.raw() for better performance
              const transactions = results.rows.raw();
              resolve(transactions);
            } catch (error) {
              reject(error);
            }
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error('Error fetching unsynced transactions batch:', error);
            reject(error);
          },
        );
      });
    });
  }

  public async updateTransactionStatusBatch(
    ticketcodes: string[],
    status: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        tx.executeSql(
          SQLBuilder.updateTransactionStatusBatch(ticketcodes, status),
          [status, ...ticketcodes],
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            resolve();
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error('Error updating transaction status batch:', error);
            reject(error);
          },
        );
      });
    });
  }

  // Check for unsynced transactions from previous draws
  public async getUnsyncedTransactionsFromPreviousDraws(
    currentDate: string,
    currentDraw: number,
  ): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        tx.executeSql(
          SQLBuilder.getUnsyncedTransactionsFromPreviousDraws(
            currentDate,
            currentDraw,
          ),
          [currentDate, currentDate, currentDraw],
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            try {
              // Use rows.raw() for better performance
              const transactions = results.rows.raw();
              resolve(transactions);
            } catch (error) {
              reject(error);
            }
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error(
              'Error fetching unsynced transactions from previous draws:',
              error,
            );
            reject(error);
          },
        );
      });
    });
  }

  public async getUnsyncedTransactionsSummary(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        tx.executeSql(
          SQLBuilder.getUnsyncedTransactionsSummary(),
          [],
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            try {
              // Use rows.raw() for better performance
              const transactions = results.rows.raw();
              resolve(transactions);
            } catch (error) {
              reject(error);
            }
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error(
              'Error fetching unsynced transactions summary:',
              error,
            );
            reject(error);
          },
        );
      });
    });
  }

  // Improved transaction deletion methods
  public async getOldTransactionsForDeletion(
    weeksOld: number = 1,
  ): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        tx.executeSql(
          SQLBuilder.getOldTransactionsForDeletion(weeksOld),
          [],
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            try {
              // Use rows.raw() for better performance
              const transactions = results.rows.raw();
              resolve(transactions);
            } catch (error) {
              reject(error);
            }
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error(
              'Error fetching old transactions for deletion:',
              error,
            );
            reject(error);
          },
        );
      });
    });
  }

  public async deleteOldTransactions(weeksOld: number = 1): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        tx.executeSql(
          SQLBuilder.deleteOldTransactions(weeksOld),
          [],
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            resolve(results.rowsAffected || 0);
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error('Error deleting old transactions:', error);
            reject(error);
          },
        );
      });
    });
  }

  public async deleteOldBets(weeksOld: number = 1): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        tx.executeSql(
          SQLBuilder.deleteOldBets(weeksOld),
          [],
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            resolve(results.rowsAffected || 0);
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error('Error deleting old bets:', error);
            reject(error);
          },
        );
      });
    });
  }

  public async deleteOldResults(weeksOld: number = 1): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        tx.executeSql(
          SQLBuilder.deleteOldResults(weeksOld),
          [],
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            resolve(results.rowsAffected || 0);
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error('Error deleting old results:', error);
            reject(error);
          },
        );
      });
    });
  }

  // Comprehensive cleanup method
  public async cleanupOldData(weeksOld: number = 1): Promise<{
    transactionsDeleted: number;
    betsDeleted: number;
    resultsDeleted: number;
  }> {
    try {
      console.log(
        `🧹 Starting database cleanup for data older than ${weeksOld} week(s)`,
      );

      // First, get a preview of what will be deleted
      const oldTransactions =
        await this.getOldTransactionsForDeletion(weeksOld);
      console.log(
        `📋 Found ${oldTransactions.length} old transactions to delete`,
      );

      if (oldTransactions.length > 0) {
        console.log('📋 Sample transactions to be deleted:');
        oldTransactions.slice(0, 3).forEach((tx: any) => {
          console.log(
            `   • ${tx.ticketcode} - ${tx.betdate} (${tx.bettime}) - ${tx.status}`,
          );
        });
      }

      // Delete old data
      const transactionsDeleted = await this.deleteOldTransactions(weeksOld);
      const betsDeleted = await this.deleteOldBets(weeksOld);
      const resultsDeleted = await this.deleteOldResults(weeksOld);

      console.log(
        `✅ Cleanup completed: ${transactionsDeleted} transactions, ${betsDeleted} bets, ${resultsDeleted} results deleted`,
      );

      // Optimize database after deletion
      await this.optimizeDatabase();

      return {
        transactionsDeleted,
        betsDeleted,
        resultsDeleted,
      };
    } catch (error) {
      console.error('❌ Error during database cleanup:', error);
      throw error;
    }
  }

  // Database optimization methods
  public async optimizeDatabase(): Promise<void> {
    try {
      console.log('🔧 Optimizing database...');

      // Analyze database statistics
      await this.executeMaintenanceQuery(SQLBuilder.analyzeDatabase());
      console.log('📊 Database analyzed');

      // Reindex for better performance
      await this.executeMaintenanceQuery(SQLBuilder.reindexDatabase());
      console.log('🔍 Database reindexed');

      // Vacuum to reclaim space
      await this.executeMaintenanceQuery(SQLBuilder.vacuumDatabase());
      console.log('💾 Database vacuumed');

      console.log('✅ Database optimization completed');
    } catch (error) {
      console.error('❌ Error optimizing database:', error);
      throw error;
    }
  }

  private async executeMaintenanceQuery(query: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        tx.executeSql(
          query,
          [],
          () => resolve(),
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error(`Error executing maintenance query: ${query}`, error);
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

  /**
   * Save or update a single maintenance schedule
   * @param schedule - Maintenance schedule object
   * @returns The ID of the saved/updated schedule
   */
  public async saveMaintenanceSchedule(schedule: {
    id?: number;
    start_time: string;
    end_time: string;
    reason?: string;
    is_active?: number;
  }): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx: DatabaseTransaction) => {
          try {
            // First, deactivate all existing schedules
            tx.executeSql(
              `UPDATE ${TABLES.MAINTENANCE_SCHEDULE} SET ${COLUMNS.MAINTENANCE_SCHEDULE.IS_ACTIVE} = 0, ${COLUMNS.MAINTENANCE_SCHEDULE.UPDATED_AT} = ?`,
              [moment().format('YYYY-MM-DD HH:mm:ss')],
            );

            // Check if there's an existing active schedule
            tx.executeSql(
              `SELECT ${COLUMNS.MAINTENANCE_SCHEDULE.ID} FROM ${TABLES.MAINTENANCE_SCHEDULE} WHERE ${COLUMNS.MAINTENANCE_SCHEDULE.IS_ACTIVE} = 1 LIMIT 1`,
              [],
              (tx: DatabaseTransaction, results: ResultSetRowList) => {
                const now = moment().format('YYYY-MM-DD HH:mm:ss');
                const scheduleData = {
                  start_time: schedule.start_time,
                  end_time: schedule.end_time,
                  reason: schedule.reason || '',
                  is_active: schedule.is_active !== undefined ? schedule.is_active : 1,
                  updated_at: now,
                };

                if (results.rows.length > 0) {
                  // Update existing schedule
                  const existingId = results.rows.item(0).id;
                  const {sql, values} = SQLBuilder.update(
                    TABLES.MAINTENANCE_SCHEDULE,
                    scheduleData,
                    {id: existingId},
                  );
                  tx.executeSql(
                    sql,
                    values,
                    () => resolve(existingId),
                    (tx: DatabaseTransaction, error: DatabaseError) => {
                      console.error('Error updating maintenance schedule:', error);
                      reject(error);
                    },
                  );
                } else {
                  // Insert new schedule
                  const {sql, values} = SQLBuilder.insert(
                    TABLES.MAINTENANCE_SCHEDULE,
                    {
                      ...scheduleData,
                      created_at: now,
                    },
                  );
                  tx.executeSql(
                    sql,
                    values,
                    (tx: DatabaseTransaction, results: ResultSetRowList) => {
                      resolve(results.insertId);
                    },
                    (tx: DatabaseTransaction, error: DatabaseError) => {
                      console.error('Error inserting maintenance schedule:', error);
                      reject(error);
                    },
                  );
                }
              },
              (tx: DatabaseTransaction, error: DatabaseError) => {
                console.error('Error checking existing maintenance schedule:', error);
                reject(error);
              },
            );
          } catch (error) {
            reject(error);
          }
        },
        (error: DatabaseError) => {
          console.error('Transaction error during maintenance schedule save:', error);
          reject(error);
        },
      );
    });
  }

  /**
   * Save multiple maintenance schedules (replaces all existing schedules)
   * @param schedules - Array of maintenance schedule objects
   * @returns Array of saved schedule IDs
   */
  public async saveMaintenanceSchedules(
    schedules: Array<{
      id?: number;
      start_time: string;
      end_time: string;
      reason?: string;
      is_active?: number;
    }>,
  ): Promise<number[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx: DatabaseTransaction) => {
          try {
            // First, deactivate all existing schedules
            tx.executeSql(
              `UPDATE ${TABLES.MAINTENANCE_SCHEDULE} SET ${COLUMNS.MAINTENANCE_SCHEDULE.IS_ACTIVE} = 0, ${COLUMNS.MAINTENANCE_SCHEDULE.UPDATED_AT} = ?`,
              [moment().format('YYYY-MM-DD HH:mm:ss')],
            );

            // Delete old schedules that are more than 7 days in the past
            const sevenDaysAgo = moment().subtract(7, 'days').format('YYYY-MM-DD HH:mm:ss');
            tx.executeSql(
              `DELETE FROM ${TABLES.MAINTENANCE_SCHEDULE} WHERE ${COLUMNS.MAINTENANCE_SCHEDULE.END_TIME} < ?`,
              [sevenDaysAgo],
            );

            const savedIds: number[] = [];
            const now = moment().format('YYYY-MM-DD HH:mm:ss');
            let completedCount = 0;
            const totalSchedules = schedules.length;

            console.log(`💾 [Maintenance DB] Saving ${totalSchedules} schedule(s) to database...`);

            if (totalSchedules === 0) {
              console.log('ℹ️ [Maintenance DB] No schedules to save');
              resolve([]);
              return;
            }

            // Save each schedule
            schedules.forEach((schedule, index) => {
              const scheduleData = {
                start_time: schedule.start_time,
                end_time: schedule.end_time,
                reason: schedule.reason || '',
                is_active: schedule.is_active !== undefined ? schedule.is_active : 1,
                updated_at: now,
              };

              const handleComplete = () => {
                completedCount++;
                console.log(`💾 [Maintenance DB] Saved ${completedCount}/${totalSchedules} schedule(s)`);
                if (completedCount === totalSchedules) {
                  console.log(`✅ [Maintenance DB] All ${totalSchedules} schedule(s) saved successfully:`, savedIds);
                  resolve(savedIds);
                }
              };

              if (schedule.id) {
                // Use INSERT OR REPLACE to handle both insert and update
                console.log(`🔄 [Maintenance DB] Upserting schedule ID ${schedule.id}:`, {
                  start: schedule.start_time,
                  end: schedule.end_time,
                  reason: schedule.reason,
                  is_active: scheduleData.is_active,
                });
                
                // Use INSERT OR REPLACE (SQLite specific) - will insert if not exists, replace if exists
                const insertData = {
                  id: schedule.id,
                  ...scheduleData,
                  created_at: now,
                };
                const columns = Object.keys(insertData);
                const placeholders = columns.map(() => '?').join(', ');
                const sql = `INSERT OR REPLACE INTO ${TABLES.MAINTENANCE_SCHEDULE} (${columns.join(', ')}) VALUES (${placeholders})`;
                const values = Object.values(insertData);
                
                console.log(`🔧 [Maintenance DB] Upsert SQL: ${sql}`);
                console.log(`🔧 [Maintenance DB] Upsert values:`, values);
                
                tx.executeSql(
                  sql,
                  values,
                  (tx: DatabaseTransaction, results: ResultSetRowList) => {
                    savedIds.push(schedule.id!);
                    console.log(`✅ [Maintenance DB] Schedule ${schedule.id} upserted successfully`);
                    handleComplete();
                  },
                  (tx: DatabaseTransaction, error: DatabaseError) => {
                    console.error(`❌ [Maintenance DB] Error upserting schedule ${schedule.id}:`, error);
                    handleComplete();
                  },
                );
              } else {
                // Insert new schedule
                console.log(`➕ [Maintenance DB] Inserting new schedule:`, {
                  start: schedule.start_time,
                  end: schedule.end_time,
                  reason: schedule.reason,
                });
                const {sql, values} = SQLBuilder.insert(
                  TABLES.MAINTENANCE_SCHEDULE,
                  {
                    ...scheduleData,
                    created_at: now,
                  },
                );
                tx.executeSql(
                  sql,
                  values,
                  (tx: DatabaseTransaction, results: ResultSetRowList) => {
                    const newId = results.insertId;
                    savedIds.push(newId);
                    console.log(`✅ [Maintenance DB] Schedule inserted with ID ${newId}`);
                    handleComplete();
                  },
                  (tx: DatabaseTransaction, error: DatabaseError) => {
                    console.error(`❌ [Maintenance DB] Error inserting schedule:`, error);
                    handleComplete();
                  },
                );
              }
            });
          } catch (error) {
            reject(error);
          }
        },
        (error: DatabaseError) => {
          console.error('Transaction error during maintenance schedules save:', error);
          reject(error);
        },
      );
    });
  }

  /**
   * Get active maintenance schedule (currently in maintenance period)
   * @returns Active maintenance schedule or null
   */
  public async getActiveMaintenanceSchedule(): Promise<{
    id: number;
    start_time: string;
    end_time: string;
    reason: string;
    is_active: number;
    created_at: string;
    updated_at: string;
  } | null> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        const now = moment().format('YYYY-MM-DD HH:mm:ss');
        console.log(`🔍 [Maintenance DB] Querying active schedule at ${now}`);
        
        // First, let's see ALL schedules (not just active) for debugging
        tx.executeSql(
          `SELECT * FROM ${TABLES.MAINTENANCE_SCHEDULE} 
           ORDER BY ${COLUMNS.MAINTENANCE_SCHEDULE.START_TIME} ASC`,
          [],
          (tx: DatabaseTransaction, allResults: ResultSetRowList) => {
            console.log(`📋 [Maintenance DB] Found ${allResults.rows.length} total schedule(s) in DB:`);
            for (let i = 0; i < allResults.rows.length; i++) {
              const s = allResults.rows.item(i);
              const startMoment = moment(s.start_time);
              const endMoment = moment(s.end_time);
              const nowMoment = moment(now);
              const isInRange = nowMoment.isBetween(startMoment, endMoment, null, '[]');
              console.log(`  Schedule ${i + 1}:`, {
                id: s.id,
                is_active: s.is_active,
                start: s.start_time,
                end: s.end_time,
                reason: s.reason,
                currentTime: now,
                isInRange: isInRange,
                startComparison: startMoment.isSameOrBefore(nowMoment),
                endComparison: endMoment.isSameOrAfter(nowMoment),
              });
            }
            
            // Now check only active ones
            tx.executeSql(
              `SELECT * FROM ${TABLES.MAINTENANCE_SCHEDULE} 
               WHERE ${COLUMNS.MAINTENANCE_SCHEDULE.IS_ACTIVE} = 1 
               ORDER BY ${COLUMNS.MAINTENANCE_SCHEDULE.START_TIME} ASC`,
              [],
              (tx: DatabaseTransaction, activeResults: ResultSetRowList) => {
                console.log(`📋 [Maintenance DB] Found ${activeResults.rows.length} active schedule(s) in DB:`);
                for (let i = 0; i < activeResults.rows.length; i++) {
                  const s = activeResults.rows.item(i);
                  const startMoment = moment(s.start_time);
                  const endMoment = moment(s.end_time);
                  const nowMoment = moment(now);
                  const isInRange = nowMoment.isBetween(startMoment, endMoment, null, '[]');
                  console.log(`  Active Schedule ${i + 1}:`, {
                    id: s.id,
                    start: s.start_time,
                    end: s.end_time,
                    reason: s.reason,
                    currentTime: now,
                    isInRange: isInRange,
                  });
                }
            
                // Now query with proper comparison
                tx.executeSql(
                  `SELECT * FROM ${TABLES.MAINTENANCE_SCHEDULE} 
                   WHERE ${COLUMNS.MAINTENANCE_SCHEDULE.IS_ACTIVE} = 1 
                   AND datetime(${COLUMNS.MAINTENANCE_SCHEDULE.START_TIME}) <= datetime(?)
                   AND datetime(${COLUMNS.MAINTENANCE_SCHEDULE.END_TIME}) >= datetime(?)
                   ORDER BY ${COLUMNS.MAINTENANCE_SCHEDULE.START_TIME} ASC 
                   LIMIT 1`,
                  [now, now],
                  (tx: DatabaseTransaction, results: ResultSetRowList) => {
                    if (results.rows.length > 0) {
                      const schedule = results.rows.item(0);
                      console.log('✅ [Maintenance DB] Active schedule found:', {
                        id: schedule.id,
                        start: schedule.start_time,
                        end: schedule.end_time,
                        reason: schedule.reason,
                      });
                      resolve(schedule);
                    } else {
                      console.log('ℹ️ [Maintenance DB] No active schedule found matching time range');
                      resolve(null);
                    }
                  },
                  (tx: DatabaseTransaction, error: DatabaseError) => {
                    console.error('❌ [Maintenance DB] Error getting active maintenance schedule:', error);
                    reject(error);
                  },
                );
              },
              (tx: DatabaseTransaction, error: DatabaseError) => {
                console.error('❌ [Maintenance DB] Error querying active schedules:', error);
                // Continue with main query anyway
              },
            );
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error('❌ [Maintenance DB] Error querying all schedules:', error);
            // Fallback to original query without datetime() function
            tx.executeSql(
              `SELECT * FROM ${TABLES.MAINTENANCE_SCHEDULE} 
               WHERE ${COLUMNS.MAINTENANCE_SCHEDULE.IS_ACTIVE} = 1 
               AND ${COLUMNS.MAINTENANCE_SCHEDULE.START_TIME} <= ? 
               AND ${COLUMNS.MAINTENANCE_SCHEDULE.END_TIME} >= ?
               ORDER BY ${COLUMNS.MAINTENANCE_SCHEDULE.START_TIME} ASC 
               LIMIT 1`,
              [now, now],
              (tx: DatabaseTransaction, results: ResultSetRowList) => {
                if (results.rows.length > 0) {
                  const schedule = results.rows.item(0);
                  console.log('✅ [Maintenance DB] Active schedule found (fallback):', {
                    id: schedule.id,
                    start: schedule.start_time,
                    end: schedule.end_time,
                    reason: schedule.reason,
                  });
                  resolve(schedule);
                } else {
                  console.log('ℹ️ [Maintenance DB] No active schedule found');
                  resolve(null);
                }
              },
              (tx: DatabaseTransaction, error2: DatabaseError) => {
                console.error('❌ [Maintenance DB] Error getting active maintenance schedule (fallback):', error2);
                reject(error2);
              },
            );
          },
        );
      });
    });
  }

  /**
   * Get all upcoming maintenance schedules (within next 7 days)
   * @returns Array of maintenance schedules
   */
  public async getUpcomingMaintenanceSchedules(): Promise<
    Array<{
      id: number;
      start_time: string;
      end_time: string;
      reason: string;
      is_active: number;
      created_at: string;
      updated_at: string;
    }>
  > {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        const now = moment().format('YYYY-MM-DD HH:mm:ss');
        const sevenDaysFromNow = moment()
          .add(7, 'days')
          .format('YYYY-MM-DD HH:mm:ss');
        tx.executeSql(
          `SELECT * FROM ${TABLES.MAINTENANCE_SCHEDULE} 
           WHERE ${COLUMNS.MAINTENANCE_SCHEDULE.IS_ACTIVE} = 1 
           AND ${COLUMNS.MAINTENANCE_SCHEDULE.END_TIME} >= ?
           AND ${COLUMNS.MAINTENANCE_SCHEDULE.START_TIME} <= ?
           ORDER BY ${COLUMNS.MAINTENANCE_SCHEDULE.START_TIME} ASC`,
          [now, sevenDaysFromNow],
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            const schedules: any[] = [];
            for (let i = 0; i < results.rows.length; i++) {
              schedules.push(results.rows.item(i));
            }
            resolve(schedules);
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error('Error getting upcoming maintenance schedules:', error);
            reject(error);
          },
        );
      });
    });
  }

  /**
   * Check if current time is within maintenance period
   * Checks all active schedules in the database
   * @returns true if currently in maintenance, false otherwise
   */
  public async isInMaintenancePeriod(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.getActiveMaintenanceSchedule()
        .then(schedule => {
          if (!schedule) {
            console.log('ℹ️ [Maintenance DB] No schedule found, not in maintenance');
            resolve(false);
            return;
          }

          const now = moment();
          const startTime = moment(schedule.start_time);
          const endTime = moment(schedule.end_time);

          // Check if current time is within the maintenance window
          const isInMaintenance = now.isBetween(startTime, endTime, null, '[]'); // [] includes both start and end
          
          console.log(`🔍 [Maintenance DB] Checking if in maintenance:`, {
            currentTime: now.format('YYYY-MM-DD HH:mm:ss'),
            startTime: startTime.format('YYYY-MM-DD HH:mm:ss'),
            endTime: endTime.format('YYYY-MM-DD HH:mm:ss'),
            isInMaintenance: isInMaintenance,
            isBeforeStart: now.isBefore(startTime),
            isAfterEnd: now.isAfter(endTime),
          });
          
          resolve(isInMaintenance);
        })
        .catch(error => {
          console.error('❌ [Maintenance DB] Error checking maintenance period:', error);
          reject(error);
        });
    });
  }

  /**
   * Get result for a specific date, draw, and bet type
   */
  public async getResult(
    betdate: string,
    bettime: number,
    bettypeid: number,
  ): Promise<Result | null> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        tx.executeSql(
          SQLBuilder.getResult(betdate, bettime, bettypeid),
          [betdate, bettime, bettypeid],
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            try {
              const rows = results.rows.raw();
              if (rows.length > 0) {
                resolve(rows[0] as Result);
              } else {
                resolve(null);
              }
            } catch (error) {
              reject(error);
            }
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error('Error fetching result:', error);
            reject(error);
          },
        );
      });
    });
  }

  /**
   * Get winners (transactions with winning bets) using SQL aggregation
   * This is optimized to calculate winnings directly in SQL
   */
  public async getWinners(
    betType: Type,
    result: Result,
  ): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        // Calculate win multiplier for rambol based on whether result is double
        const winRambol = checkIfDouble(result.result)
          ? betType.winram2
          : betType.winram;

        tx.executeSql(
          SQLBuilder.getWinners(betType, result),
          [
            result.result,
            betType.wintar,
            result.resultr,
            winRambol,
            result.result,
            betType.wintar,
            result.resultr,
            winRambol,
            result.betdate,
            result.bettime,
            result.bettypeid,
            result.result,
            result.resultr,
          ],
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            try {
              // Use rows.raw() for better performance
              const rows = results.rows.raw();
              // Filter out transactions with total = 0
              const transactions = rows.filter(
                (row: any) => row.total > 0,
              );
              resolve(transactions);
            } catch (error) {
              reject(error);
            }
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error('Error fetching winners:', error);
            reject(error);
          },
        );
      });
    });
  }

  /**
   * Get winning bets for a specific transaction
   * Optimized to use rows.raw() for better performance
   */
  public async getWinningTransactionBets(
    transid: number,
    result: Result,
  ): Promise<Bet[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        tx.executeSql(
          `SELECT * FROM ${TABLES.BET} 
           WHERE ${COLUMNS.BET.TRANSID} = ? 
           AND ((${COLUMNS.BET.BETNUMBER} = ? AND ${COLUMNS.BET.TARGET} > 0) 
                OR (${COLUMNS.BET.BETNUMBERR} = ? AND ${COLUMNS.BET.RAMBOL} > 0))`,
          [transid, result.result, result.resultr],
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            try {
              // Use rows.raw() for better performance
              const rows = results.rows.raw();
              const bets: Bet[] = rows.map((row: any) => ({
                id: row.id,
                transid: row.transid,
                tranno: row.tranno,
                betNumber: row.betnumber,
                betNumberr: row.betnumberr,
                targetAmount: row.target,
                rambolAmount: row.rambol,
                subtotal: row.subtotal,
              }));
              resolve(bets);
            } catch (error) {
              reject(error);
            }
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error('Error fetching winning transaction bets:', error);
            reject(error);
          },
        );
      });
    });
  }

  // ============================================================================
  // Delta Sync Optimized Methods
  // ============================================================================

  /**
   * Get all ticketcodes for a specific draw (optimized for delta comparison)
   */
  public async getLocalTicketcodes(
    betdate: string,
    bettime: number,
    bettypeid: number,
  ): Promise<Set<string>> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        tx.executeSql(
          SQLBuilder.getLocalTicketcodes(betdate, bettime, bettypeid),
          [betdate, bettime, bettypeid],
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            try {
              const rows = results.rows.raw();
              const ticketcodes = new Set<string>(rows.map((row: any) => row.ticketcode as string));
              resolve(ticketcodes);
            } catch (error) {
              reject(error);
            }
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error('Error fetching local ticketcodes:', error);
            reject(error);
          },
        );
      });
    });
  }

  /**
   * Get transaction count for quick comparison
   */
  public async getTransactionCount(
    betdate: string,
    bettime: number,
    bettypeid: number,
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        tx.executeSql(
          SQLBuilder.getTransactionCount(betdate, bettime, bettypeid),
          [betdate, bettime, bettypeid],
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            try {
              const count = results.rows.item(0).count;
              resolve(count);
            } catch (error) {
              reject(error);
            }
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error('Error fetching transaction count:', error);
            reject(error);
          },
        );
      });
    });
  }

  /**
   * Get transactions summary (count, amount, sync status)
   */
  public async getTransactionsSummary(
    betdate: string,
    bettime: number,
    bettypeid: number,
  ): Promise<{
    totalCount: number;
    totalAmount: number;
    syncedCount: number;
    unsyncedCount: number;
    lastTransactionTime: string | null;
  }> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        tx.executeSql(
          SQLBuilder.getTransactionsSummary(betdate, bettime, bettypeid),
          [betdate, bettime, bettypeid],
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            try {
              const row = results.rows.item(0);
              resolve({
                totalCount: row.total_count || 0,
                totalAmount: row.total_amount || 0,
                syncedCount: row.synced_count || 0,
                unsyncedCount: row.unsynced_count || 0,
                lastTransactionTime: row.last_transaction_time || null,
              });
            } catch (error) {
              reject(error);
            }
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error('Error fetching transactions summary:', error);
            reject(error);
          },
        );
      });
    });
  }

  /**
   * Check if a transaction exists by ticketcode (optimized)
   */
  public async transactionExists(ticketcode: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        tx.executeSql(
          SQLBuilder.transactionExists(ticketcode),
          [ticketcode],
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            resolve(results.rows.length > 0);
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error('Error checking transaction exists:', error);
            reject(error);
          },
        );
      });
    });
  }

  /**
   * Get a transaction by ticketcode
   * Returns the full transaction object or null if not found
   */
  public async getTransactionByTicketCode(ticketcode: string): Promise<any | null> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        tx.executeSql(
          `SELECT * FROM ${TABLES.TRANS} WHERE ${COLUMNS.TRANS.TICKETCODE} = ? LIMIT 1`,
          [ticketcode],
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            if (results.rows.length > 0) {
              resolve(results.rows.item(0));
            } else {
              resolve(null);
            }
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error('Error fetching transaction by ticketcode:', error);
            reject(error);
          },
        );
      });
    });
  }

  /**
   * Get existing ticketcodes from a list (for batch insert optimization)
   */
  public async getExistingTicketcodes(ticketcodes: string[]): Promise<Set<string>> {
    if (ticketcodes.length === 0) {
      return new Set();
    }

    return new Promise((resolve, reject) => {
      this.db.transaction((tx: DatabaseTransaction) => {
        tx.executeSql(
          SQLBuilder.getExistingTicketcodes(ticketcodes),
          ticketcodes,
          (tx: DatabaseTransaction, results: ResultSetRowList) => {
            try {
              const rows = results.rows.raw();
              const existing = new Set<string>(rows.map((row: any) => row.ticketcode as string));
              resolve(existing);
            } catch (error) {
              reject(error);
            }
          },
          (tx: DatabaseTransaction, error: DatabaseError) => {
            console.error('Error fetching existing ticketcodes:', error);
            reject(error);
          },
        );
      });
    });
  }

  /**
   * Batch insert transactions (optimized for delta sync)
   */
  public async batchInsertTransactions(
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
  ): Promise<{inserted: number; skipped: number}> {
    let inserted = 0;
    let skipped = 0;

    // First, check which ticketcodes already exist
    const ticketcodes = transactions.map(t => t.ticketcode);
    const existing = await this.getExistingTicketcodes(ticketcodes);

    // Filter to only new transactions
    const newTransactions = transactions.filter(t => !existing.has(t.ticketcode));
    skipped = transactions.length - newTransactions.length;

    if (newTransactions.length === 0) {
      return {inserted: 0, skipped};
    }

    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx: DatabaseTransaction) => {
          for (const trans of newTransactions) {
            // Insert transaction
            tx.executeSql(
              SQLBuilder.upsertTransaction(),
              [
                trans.ticketcode,
                trans.betdate,
                trans.bettime,
                trans.bettypeid,
                trans.total,
                trans.status,
                trans.trans_data,
                trans.trans_no,
                trans.created_at,
              ],
              (tx: DatabaseTransaction, results: ResultSetRowList) => {
                const transId = results.insertId;
                if (transId && trans.bets && trans.bets.length > 0) {
                  // Insert bets
                  for (const bet of trans.bets) {
                    tx.executeSql(
                      `INSERT INTO ${TABLES.BET} (
                        ${COLUMNS.BET.TRANSID},
                        ${COLUMNS.BET.TRANNO},
                        ${COLUMNS.BET.BETNUMBER},
                        ${COLUMNS.BET.BETNUMBERR},
                        ${COLUMNS.BET.TARGET},
                        ${COLUMNS.BET.RAMBOL},
                        ${COLUMNS.BET.SUBTOTAL}
                      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                      [
                        transId,
                        bet.tranno || 1,
                        bet.betNumber || '',
                        bet.betNumberr || bet.betNumber || '',
                        bet.targetAmount || 0,
                        bet.rambolAmount || 0,
                        (bet.targetAmount || 0) + (bet.rambolAmount || 0),
                      ],
                    );
                  }
                }
                inserted++;
              },
              (tx: DatabaseTransaction, error: DatabaseError) => {
                console.error(`Error inserting transaction ${trans.ticketcode}:`, error);
                skipped++;
              },
            );
          }
        },
        (error: any) => {
          console.error('Batch insert transaction error:', error);
          reject(error);
        },
        () => {
          resolve({inserted, skipped});
        },
      );
    });
  }

  public async closeDatabase(): Promise<void> {
    return this.db.close();
  }
}

export default DatabaseService;
