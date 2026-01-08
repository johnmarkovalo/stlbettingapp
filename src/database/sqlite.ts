import SQLite, {ResultSetRowList} from 'react-native-sqlite-storage';
import {formatTime} from '../helper/functions';
import Type from '../models/Type';
import Bet from '../models/Bet';
import Transaction from '../models/Transaction';
import {checkIfDouble} from '../helper/functions';
import moment from 'moment';
import {DatabaseService} from './DatabaseService';
import {SQLBuilder} from './SQLBuilder';
import {TABLES, COLUMNS} from './DatabaseTypes';

// Initialize the new DatabaseService
const dbService = DatabaseService.getInstance();

// Legacy database instance for backward compatibility
const db = SQLite.openDatabase({name: 'zian.db', location: 'default'});

// Migration layer - these functions now use DatabaseService internally
const initializeDatabase = async () => {
  try {
    return await dbService.initializeDatabase();
  } catch (error) {
    console.error('Error initializing database with DatabaseService:', error);
    // Fallback to old implementation if needed
    return new Promise((resolve, reject) => {
      db.transaction((tx: any) => {
        //Create settings table
        tx.executeSql(
          'CREATE TABLE IF NOT EXISTS settings' +
            '(id INTEGER PRIMARY KEY AUTOINCREMENT, active INTEGER DEFAULT 1, bettype TEXT,' +
            'cnt TEXT, perc TEXT, maxlength INTEGER DEFAULT 3, divisible INTEGER DEFAULT 0,' +
            'start11 INTEGER, start11m INTEGER, end11 INTEGER, end11m INTEGER, start4 INTEGER, start4m INTEGER,' +
            'end4 INTEGER, end4m INTEGER, start9 INTEGER, start9m INTEGER, end9 INTEGER, end9m INTEGER,' +
            'limits INTEGER DEFAULT 10, capping INTEGER DEFAULT 250, wintar INTEGER, winram INTEGER, winram2 INTEGER, bettypeid INTEGER)',
        );
        //Create trans table
        tx.executeSql(
          'CREATE TABLE IF NOT EXISTS trans' +
            '(id INTEGER PRIMARY KEY AUTOINCREMENT, trans_no INTEGER, ticketcode TEXT, total INTEGER, trans_data TEXT,' +
            "bettypeid INTEGER, betdate DATE, bettime INTEGER, status TEXT DEFAULT 'saved', created_at TEXT)",
        );
        tx.executeSql('CREATE INDEX index_ticketcode ON trans (ticketcode)');
        tx.executeSql(
          'CREATE INDEX trans_composite_index ON trans (betdate, bettime, bettypeid)',
        );
        //Create bet table
        tx.executeSql(
          'CREATE TABLE IF NOT EXISTS bet' +
            '(id INTEGER PRIMARY KEY AUTOINCREMENT, transid INTEGER REFERENCES trans(id) ON DELETE CASCADE, tranno INTEGER, betnumber TEXT,' +
            "betnumberr TEXT, target INTEGER, rambol INTEGER, subtotal INTEGER, status TEXT DEFAULT 'saved', created_at DATE DEFAULT CURRENT_TIMESTAMP)",
        );
        //Create result table
        tx.executeSql(
          'CREATE TABLE IF NOT EXISTS result' +
            '(id INTEGER PRIMARY KEY AUTOINCREMENT, bettypeid INTEGER, result TEXT, resultr TEXT, betdate DATE,' +
            'bettime INTEGER, created_at DATE DEFAULT CURRENT_TIMESTAMP)',
        );
        tx.executeSql(
          'CREATE INDEX result_composite_index ON result (betdate, bettime, bettypeid)',
        );
      });

      insertInitialData();

      resolve(true);
    });
  }
};

const insertInitialData = () => {
  //Insert initial settings
  const now = moment().format('YYYY-MM-DD HH:mm:ss');
  db.transaction((tx: any) => {
    tx.executeSql(
      'INSERT INTO settings(bettype, wintar, winram, winram2, maxlength, cnt, perc, bettypeid,' +
        'start11, start11m, end11, end11m, start4, start4m, end4, end4m, start9, start9m, end9, end9m, active) VALUES ' +
        "('DEFAULTS', '450', '75', '150', '3', '1.5M', '78%', '1'," +
        "'4', '0', '10', '30', '11', '10', '15', '30', '16', '10', '20', '30', '0')",
      [],
      () => {
        console.log('Types inserted successfully');
      },
      (error: any) => {
        console.log('Error inserting types:', error);
      },
    );

    tx.executeSql(
      'INSERT INTO settings(bettype, wintar, winram, winram2, maxlength, cnt, perc, bettypeid,' +
        'start11, start11m, end11, end11m, start4, start4m, end4, end4m, start9, start9m, end9, end9m) VALUES ' +
        "('S3', '450', '75', '150', '3', '1.5M', '78%', '2'," +
        "'4', '0', '13', '45', '14', '15', '16', '45', '17', '10', '20', '45')," +
        "('STL SWER3', '450', '75', '150', '3', '1.5M', '78%', '3'," +
        "'4', '0', '10', '30', '11', '10', '15', '30', '16', '10', '20', '30')," +
        "('LOC SWER3', '450', '75', '150', '3', '1.5M', '78%', '4'," +
        "'4', '0', '10', '15', '11', '10', '15', '15', '16', '10', '20', '15')," +
        "('LAST 2', '450', '75', '150', '2', '1.5M', '78%', '5'," +
        "'4', '0', '10', '30', '11', '10', '15', '30', '16', '10', '20', '30')",
      [],
    );

    tx.executeSql(
      'INSERT INTO trans (trans_no, ticketcode, total, trans_data, bettypeid, betdate, bettime, created_at, status ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        1,
        '4064–3336–6537–3166',
        20,
        '247 10 10',
        '2',
        '2023-04-03',
        3,
        now,
        'synced',
      ],
      () => {
        console.log('Transaction inserted successfully');
      },
      (error: any) => {
        console.error('Error inserting transaction:', error);
      },
    );

    tx.executeSql(
      'INSERT INTO bet (transid, tranno, betnumber, betnumberr, target, rambol, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [1, 1, '247', '247', 10, 10, 20],
      () => {
        console.log('Bet inserted successfully');
      },
      (error: any) => {
        console.error('Error inserting bet:', error);
      },
    );

    tx.executeSql(
      'INSERT INTO result (bettypeid, result, resultr, betdate, bettime) VALUES (?, ?, ?, ?, ?)',
      [2, '247', '247', '2024-04-03', 3],
      () => {
        console.log('Result inserted successfully');
      },
    );
  });
};

const deleteLastWeekTransactions = async () => {
  return new Promise<void>((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        'DELETE FROM trans WHERE betdate < ?',
        [moment().subtract(7, 'days').format('YYYY-MM-DD')],
        () => {
          console.log('Transactions deleted successfully');
          resolve();
        },
        (error: any) => {
          console.error('Error deleting transactions:', error);
          reject(error);
        },
      );
    });
  });
};
//Get Functions
const getActiveTypes = () => {
  try {
    return dbService.getActiveTypes();
  } catch (error) {
    console.error(
      'Error using DatabaseService, falling back to legacy implementation:',
      error,
    );
    // Fallback to old implementation
    return new Promise<Type[]>((resolve, reject) => {
      db.transaction((tx: any) => {
        tx.executeSql(
          'SELECT * FROM settings WHERE active = 1',
          [],
          (tx: any, results: ResultSetRowList) => {
            const rows = results.rows.raw(); // Extract raw rows
            const len = rows.length;
            const types: Type[] = [];
            for (let i = 0; i < len; i++) {
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
              } = rows[i];
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
              types.push({
                id: bettypeid,
                bettypeid: bettypeid,
                name: bettype,
                limit: limits,
                capping,
                wintar,
                winram,
                winram2,
                draws,
              });
            }
            resolve(types);
          },
          (tx: any, error: any) => {
            console.log('Error fetching active types:', error);
            reject(error);
          },
        );
      });
    });
  }
};

const getTransactions = (
  betdate: string,
  bettime: number,
  bettypeid: number,
) => {
  try {
    return dbService.getTransactions(betdate, bettime, bettypeid);
  } catch (error) {
    console.error(
      'Error using DatabaseService, falling back to legacy implementation:',
      error,
    );
    // Fallback to old implementation
    return new Promise((resolve, reject) => {
      db.transaction((tx: any) => {
        tx.executeSql(
          'SELECT * FROM trans WHERE betdate = ? AND bettime = ? AND bettypeid = ? ORDER BY trans_no ASC',
          [betdate, bettime, bettypeid],
          (tx: any, results: any) => {
            const rows = results.rows;
            const len = rows.length;
            const transactions: any[] = [];
            for (let i = 0; i < len; i++) {
              const transaction = rows.item(i);
              transactions.push(transaction);
            }
            resolve(transactions);
          },
          (error: any) => {
            console.error('Error fetching transactions:', error);
            reject(error); // Reject the promise on error
          },
        );
      });
    });
  }
};

const getTransactionByTicketCode = (
  ticketcode: string,
  callback: (transaction: any) => void,
) => {
  console.log('checking local db');
  db.transaction((tx: any) => {
    tx.executeSql(
      'SELECT * FROM trans WHERE ticketcode = ? LIMIT 1',
      [ticketcode],
      (tx: any, results: any) => {
        const rows = results.rows;
        const len = rows.length;
        if (len > 0) {
          console.log('found in local db');
          const transaction = rows.item(0);
          callback(transaction);
        } else {
          console.log('not found in local db');
          callback(null);
        }
      },
      (error: any) => {
        console.error('Error fetching transaction:', error);
      },
    );
  });
};

const getBetsByTransaction = (transid: number) => {
  try {
    return dbService.getBetsByTransaction(transid);
  } catch (error) {
    console.error(
      'Error using DatabaseService, falling back to legacy implementation:',
      error,
    );
    // Fallback to old implementation
    return new Promise((resolve, reject) => {
      db.transaction((tx: any) => {
        tx.executeSql(
          'SELECT * FROM bet WHERE transid = ?',
          [transid],
          (tx: any, results: any) => {
            const rows = results.rows;
            const len = rows.length;
            const bets: Bet[] = [];
            for (let i = 0; i < len; i++) {
              const {
                id,
                transid,
                betnumber,
                betnumberr,
                target,
                rambol,
                subtotal,
              } = rows.item(i);
              bets.push({
                tranno: id,
                transid: transid,
                betNumber: betnumber,
                betNumberr: betnumberr,
                targetAmount: target,
                rambolAmount: rambol,
                subtotal: subtotal,
              });
            }
            resolve(bets);
          },
          (error: any) => {
            console.error('Error fetching bets:', error);
            reject(error);
          },
        );
      });
    });
  }
};

const getResult = (betDate: string, betTime: number, betTypeId: number) => {
  try {
    // Use optimized DatabaseService method
    return dbService.getResult(betDate, betTime, betTypeId);
  } catch (error) {
    console.error(
      'Error using DatabaseService, falling back to legacy implementation:',
      error,
    );
    // Fallback to old implementation with optimized row iteration
    return new Promise((resolve, reject) => {
      db.transaction(
        (tx: any) => {
          tx.executeSql(
            SQLBuilder.getResult(betDate, betTime, betTypeId),
            [betDate, betTime, betTypeId],
            (tx: any, results: any) => {
              try {
                // Use rows.raw() for better performance
                const rows = results.rows.raw();
                if (rows.length > 0) {
                  resolve(rows[0]);
                } else {
                  resolve(null);
                }
              } catch (error) {
                reject(error);
              }
            },
          );
        },
        error => {
          reject(error);
        },
      );
    });
  }
};

const getWinners = (betType: any, result: any) => {
  try {
    // Use optimized DatabaseService method
    return dbService.getWinners(betType, result);
  } catch (error) {
    console.error(
      'Error using DatabaseService, falling back to legacy implementation:',
      error,
    );
    // Fallback to old implementation with optimized row iteration
    return new Promise((resolve, reject) => {
      db.transaction((tx: any) => {
        tx.executeSql(
          SQLBuilder.getWinners(betType, result),
          [
            result.result,
            betType.wintar,
            result.resultr,
            checkIfDouble(result.result) ? betType.winram2 : betType.winram,
            result.result,
            betType.wintar,
            result.resultr,
            checkIfDouble(result.result) ? betType.winram2 : betType.winram,
            result.betdate,
            result.bettime,
            result.bettypeid,
            result.result,
            result.resultr,
          ],
          (tx: any, results: any) => {
            try {
              // Use rows.raw() for better performance
              const rows = results.rows.raw();
              // Filter out transactions with total = 0
              const transactions = rows.filter(
                (transaction: any) => transaction.total > 0,
              );
              resolve(transactions);
            } catch (error) {
              reject(error);
            }
          },
          (error: any) => {
            console.error('Error fetching winners:', error);
            reject(error);
          },
        );
      });
    });
  }
};

const getWinningTransactionBets = async (
  transid: number,
  result: any,
): Promise<any[]> => {
  try {
    // Use optimized DatabaseService method (returns Promise)
    return await dbService.getWinningTransactionBets(transid, result);
  } catch (error) {
    console.error(
      'Error using DatabaseService, falling back to legacy implementation:',
      error,
    );
    // Fallback to old implementation with optimized row iteration
    return new Promise((resolve, reject) => {
      db.transaction((tx: any) => {
        tx.executeSql(
          `SELECT * FROM ${TABLES.BET} WHERE ${COLUMNS.BET.TRANSID} = ? AND ((${COLUMNS.BET.BETNUMBER} = ? AND ${COLUMNS.BET.TARGET}>0) OR (${COLUMNS.BET.BETNUMBERR} = ? AND ${COLUMNS.BET.RAMBOL}>0))`,
          [transid, result.result, result.resultr],
          (tx: any, results: any) => {
            try {
              // Use rows.raw() for better performance
              const rows = results.rows.raw();
              const bets = rows.map((bet: any) => ({
                id: bet.id,
                betNumber: bet.betnumber,
                targetAmount: bet.target,
                rambolAmount: bet.rambol,
                subtotal: bet.subtotal,
              }));
              resolve(bets);
            } catch (error) {
              reject(error);
            }
          },
          (error: any) => {
            console.error('Error fetching winning transaction bets:', error);
            reject(error);
          },
        );
      });
    });
  }
};

// const checkTransactionIfWinning = (
//   ticketcode: string,
//   callback: (isWinning: boolean) => void,

// )

const closeDatabaseConnection = () => {
  db.close();
};

//Insert Functions
const insertTypes = (types: any) => {
  db.transaction((tx: any) => {
    tx.executeSql('DELETE FROM settings', [], (tx: any, results: any) => {
      console.log('deleted');
    });
  });
  types.forEach(type => {
    db.transaction((tx: any) => {
      tx.executeSql(
        'SELECT 1 FROM settings WHERE bettypeid=?',
        [type.bettypeid],
        (tx: any, results: any) => {
          const cs = results.rows;
          const cv = {
            active: type.active,
            bettype: type.bettype,
            wintar: type.wintar,
            winram: type.winram,
            winram2: type.winram2,
            maxlength: type.maxlength,
            cnt: type.cnt,
            perc: type.perc,
            divisible: type.divisible,
            limits: type.limits,
            capping: type.capping,
            bettypeid: type.bettypeid,
            start11: type.start11,
            start11m: type.start11m,
            end11: type.end11,
            end11m: type.end11m,
            start4: type.start4,
            start4m: type.start4m,
            end4: type.end4,
            end4m: type.end4m,
            start9: type.start9,
            start9m: type.start9m,
            end9: type.end9,
            end9m: type.end9m,
          };

          if (cs.length === 0) {
            tx.executeSql(
              'INSERT OR REPLACE INTO settings (active, bettype, wintar, winram, winram2, maxlength, cnt, perc, divisible, limits, capping, bettypeid, start11, start11m, end11, end11m, start4, start4m, end4, end4m, start9, start9m, end9, end9m) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              Object.values(cv),
              () => {
                console.log('Setting inserted successfully');
              },
              (error: any) => {
                console.error('Error inserting setting:', error);
              },
            );
          } else {
            delete cv.bettypeid;
            tx.executeSql(
              'UPDATE settings SET active=?, bettype=?, wintar=?, winram=?, winram2=?, maxlength=?, cnt=?, perc=?, divisible=?, limits=?, capping=?, start11=?, start11m=?, end11=?, end11m=?, start4=?, start4m=?, end4=?, end4m=?, start9=?, start9m=?, end9=?, end9m=? WHERE bettypeid=?',
              [...Object.values(cv), type.bettypeid],
              () => {
                console.log('Setting updated successfully');
              },
              (error: any) => {
                console.error('Error updating setting:', error);
              },
            );
          }
        },
        (error: any) => {
          console.error('Error fetching setting:', error);
        },
      );
    });
  });

  db.transaction((tx: any) => {
    tx.executeSql('SELECT * FROM settings', [], (tx: any, results: any) => {
      const rows = results.rows.raw(); // Extract raw rows
      const len = rows.length;
      const newTypes: Type[] = [];
      for (let i = 0; i < len; i++) {
        const {
          id,
          bettype,
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
        } = rows[i];
        const draws = [
          {
            start: formatTime(start11, start11m),
            end: formatTime(end11, end11m),
          },
          {start: formatTime(start4, start4m), end: formatTime(end4, end4m)},
          {start: formatTime(start9, start9m), end: formatTime(end9, end9m)},
        ];
        newTypes.push({
          id: bettypeid,
          name: bettype,
          limit: limits,
          capping,
          wintar,
          winram,
          winram2,
          draws,
        });
      }
      callback(newTypes);
    });
  });
};

const insertTransaction = (transaction: Transaction, bets: Bet[]) => {
  try {
    return dbService.insertTransaction(transaction, bets);
  } catch (error) {
    console.error(
      'Error using DatabaseService, falling back to legacy implementation:',
      error,
    );
    // Fallback to old implementation
    return new Promise((resolve, reject) => {
      console.log('created_at', transaction.created_at);

      db.transaction((tx: any) => {
        // Step 1: Check if a transaction with the same ticketcode already exists
        tx.executeSql(
          'SELECT id FROM trans WHERE ticketcode = ?',
          [transaction.ticketcode],
          (tx: any, results: any) => {
            if (results.rows.length > 0) {
              console.log(
                'Duplicate transaction detected (same ticketcode):',
                transaction.ticketcode,
              );
              resolve(null); // Resolve with null indicating duplicate transaction by ticketcode
              return;
            }

            // Step 2: Check if a transaction with the same trans_data exists, filtered by betdate, bettime, and bettypeid, and created within the last 4 seconds
            tx.executeSql(
              `SELECT created_at FROM trans 
               WHERE trans_data = ? AND betdate = ? AND bettime = ? AND bettypeid = ? 
               ORDER BY created_at DESC LIMIT 1`,
              [
                transaction.trans_data,
                transaction.betdate,
                transaction.bettime,
                transaction.bettypeid,
              ],
              (tx: any, results: any) => {
                if (results.rows.length > 0) {
                  const lastCreatedAt = new Date(
                    results.rows.item(0).created_at,
                  ).getTime();
                  const currentCreatedAt = new Date(
                    transaction.created_at || new Date(),
                  ).getTime();
                  const timeDifference =
                    (currentCreatedAt - lastCreatedAt) / 1000; // Time difference in seconds

                  if (timeDifference <= 4) {
                    console.log(
                      'Duplicate transaction detected (within 4 seconds):',
                      transaction.trans_data,
                    );
                    resolve(null); // Resolve with null indicating duplicate transaction by trans_data
                    return;
                  }
                }

                // Step 3: Check if trans_no already exists, filtered by betdate, bettime, and bettypeid
                tx.executeSql(
                  `SELECT trans_no FROM trans 
                   WHERE trans_no = ? AND betdate = ? AND bettime = ? AND bettypeid = ?`,
                  [
                    transaction.trans_no,
                    transaction.betdate,
                    transaction.bettime,
                    transaction.bettypeid,
                  ],
                  (tx: any, transResults: any) => {
                    if (transResults.rows.length > 0) {
                      // Step 4: If trans_no exists, increment all subsequent trans_no by 1
                      tx.executeSql(
                        `UPDATE trans 
                         SET trans_no = trans_no + 1 
                         WHERE trans_no >= ? AND betdate = ? AND bettime = ? AND bettypeid = ?`,
                        [
                          transaction.trans_no,
                          transaction.betdate,
                          transaction.bettime,
                          transaction.bettypeid,
                        ],
                        () => {
                          console.log(
                            'Updated trans_no for subsequent transactions',
                          );
                        },
                        (error: any) => {
                          console.error('Error updating trans_no:', error);
                          reject(error);
                        },
                      );
                    }

                    // Step 5: Insert the new transaction after updating trans_no
                    tx.executeSql(
                      `INSERT INTO trans (ticketcode, trans_data, betdate, bettime, bettypeid, trans_no, total, status, created_at) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                      [
                        transaction.ticketcode,
                        transaction.trans_data,
                        transaction.betdate,
                        transaction.bettime,
                        transaction.bettypeid,
                        transaction.trans_no,
                        transaction.total,
                        transaction.status,
                        transaction.created_at,
                      ],
                      (tx: any, results: any) => {
                        const insertedId = results.insertId;
                        resolve(insertedId); // Pass the inserted ID back to the callback

                        // Step 6: Insert bets associated with the transaction
                        bets.forEach((bet: Bet) => {
                          tx.executeSql(
                            `INSERT INTO bet (transid, tranno, betnumber, betnumberr, target, rambol, subtotal) 
                             VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [
                              insertedId,
                              bet.tranno,
                              bet.betNumber,
                              bet.betNumberr,
                              bet.targetAmount,
                              bet.rambolAmount,
                              bet.subtotal,
                            ],
                            () => {
                              console.log('Bet inserted successfully');
                            },
                            (error: any) => {
                              console.error('Error inserting bet:', error);
                            },
                          );
                        });
                      },
                      (error: any) => {
                        console.error('Error inserting transaction:', error);
                        reject(error);
                      },
                    );
                  },
                  (error: any) => {
                    console.error('Error checking trans_no:', error);
                    reject(error);
                  },
                );
              },
              (error: any) => {
                console.error(
                  'Error checking existing transaction by trans_data:',
                  error,
                );
                reject(error);
              },
            );
          },
          (error: any) => {
            console.error(
              'Error checking existing transaction by ticketcode:',
              error,
            );
            reject(error);
          },
        );
      });
    });
  }
};

const insertOrUpdateResult = (result: any) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      // Step 1: Check if the result already exists
      tx.executeSql(
        'SELECT id FROM result WHERE bettypeid = ? AND betdate = ? AND bettime = ?',
        [result.bettypeid, result.betdate, result.bettime],
        (tx: any, selectResults: any) => {
          if (selectResults.rows.length > 0) {
            // Step 2: If the result exists, update it
            const existingId = selectResults.rows.item(0).id;
            tx.executeSql(
              'UPDATE result SET result = ?, resultr = ? WHERE id = ?',
              [result.result, result.resultr, existingId],
              () => {
                console.log('Result updated successfully');
                resolve(existingId);
              },
              (error: any) => {
                console.error('Error updating result:', error);
                reject(error);
              },
            );
          } else {
            // Step 3: If the result does not exist, insert a new one
            tx.executeSql(
              'INSERT INTO result (bettypeid, result, resultr, betdate, bettime) VALUES (?, ?, ?, ?, ?)',
              [
                result.bettypeid,
                result.result,
                result.resultr,
                result.betdate,
                result.bettime,
              ],
              (tx: any, insertResults: any) => {
                const insertedId = insertResults.insertId;
                console.log('Result inserted successfully');
                resolve(insertedId);
              },
              (error: any) => {
                console.error('Error inserting result:', error);
                reject(error);
              },
            );
          }
        },
        (error: any) => {
          console.error('Error checking existing result:', error);
          reject(error);
        },
      );
    });
  });
};

//Update Functions
const updateTransactionStatus = (transactionId: number, status: string) => {
  db.transaction((tx: any) => {
    tx.executeSql(
      'UPDATE trans SET status = ? WHERE id = ?',
      [status, transactionId],
      () => {
        console.log(
          'Transaction ' + transactionId + ' status updated to ' + status,
        );
      },
      (error: any) => {
        console.error('Error updating transaction status:', error);
      },
    );
  });
};

//Helper Functions
const getLatestTransaction = (
  betdate: string,
  bettime: number,
  bettypeid: number,
) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        'SELECT * FROM trans WHERE betdate = ? AND bettime = ? AND bettypeid = ? ORDER BY trans_no DESC LIMIT 1',
        [betdate, bettime, bettypeid],
        (tx: any, results: any) => {
          const rows = results.rows;
          const len = rows.length;
          if (len > 0) {
            const transaction = rows.item(0);
            resolve(transaction);
          } else {
            resolve(null);
          }
        },
        (error: any) => {
          console.error('Error fetching transactions:', error);
        },
      );
    });
  });
};

const getLatestTransactionDateTime = () => {
  //Check if dateTime < latest transaction created_at
  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        'SELECT * FROM trans ORDER BY created_at DESC LIMIT 1',
        [],
        (tx: any, results: any) => {
          const rows = results.rows;
          const transaction = rows.item(0);
          resolve(transaction.created_at);
        },
        (error: any) => {
          console.error('Error fetching transactions:', error);
        },
      );
    });
  });
};

const checkLastDrawTransactionStatus = () => {
  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        'SELECT * FROM trans WHERE NOT status = "synced" ORDER BY trans_no DESC LIMIT 1',
        [],
        (tx: any, results: any) => {
          const rows = results.rows;
          const len = rows.length;
          if (len > 0) {
            resolve(true);
          } else {
            resolve(false);
          }
        },
        (error: any) => {
          console.error('Error fetching transactions:', error);
        },
      );
    });
  });
};

export {
  initializeDatabase,
  getActiveTypes,
  getTransactions,
  getTransactionByTicketCode,
  getBetsByTransaction,
  getWinningTransactionBets,
  getWinners,
  getResult,
  insertTransaction,
  insertTypes,
  insertOrUpdateResult,
  getLatestTransaction,
  getLatestTransactionDateTime,
  checkLastDrawTransactionStatus,
  updateTransactionStatus,
  deleteLastWeekTransactions,
  closeDatabaseConnection,
};
