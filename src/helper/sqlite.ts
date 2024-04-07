import SQLite, {ResultSetRowList} from 'react-native-sqlite-storage';
import {formatTime} from './functions';
import Type from '../models/Type';
import Bet from '../models/Bet';
import Transaction from '../models/Transaction';
import {checkIfDouble} from './functions';

const openDatabaseConnection = () => {
  const db = SQLite.openDatabase({name: 'zian.db', location: 'default'});
  return db;
};

const initializeDatabase = () => {
  const db = openDatabaseConnection();
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
        '(id INTEGER PRIMARY KEY AUTOINCREMENT, trans_no INTEGER, ticketcode TEXT, total INTEGER, transdata TEXT,' +
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
};

const insertInitialData = () => {
  const db = openDatabaseConnection();
  //Insert initial settings
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
        "'4', '0', '10', '30', '11', '10', '15', '30', '16', '10', '20', '30')," +
        "('STL SWER3', '450', '75', '150', '3', '1.5M', '78%', '3'," +
        "'4', '0', '10', '30', '11', '10', '15', '30', '16', '10', '20', '30')," +
        "('LOC SWER3', '450', '75', '150', '3', '1.5M', '78%', '4'," +
        "'4', '0', '10', '15', '11', '10', '15', '15', '16', '10', '20', '15')," +
        "('LAST 2', '450', '75', '150', '2', '1.5M', '78%', '5'," +
        "'4', '0', '10', '30', '11', '10', '15', '30', '16', '10', '20', '30')",
      [],
    );

    tx.executeSql(
      'INSERT INTO trans (trans_no, ticketcode, total, transdata, bettypeid, betdate, bettime ) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [1, '4064–3336–6537–3166', 20, '247 10 10', '2', '2024-04-03', 3],
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

const deleteRecords = (table: string, where: string) => {
  const db = openDatabaseConnection();
  db.transaction((tx: any) => {
    tx.executeSql('DELETE FROM ' + table + ' WHERE ' + where, [], () => {
      console.log('deleted');
    });
  });
};
//Get Functions
const getActiveTypes = (callback: (types: Type[]) => void) => {
  const db = openDatabaseConnection();

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
            {start: formatTime(start4, start4m), end: formatTime(end4, end4m)},
            {start: formatTime(start9, start9m), end: formatTime(end9, end9m)},
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
        callback(types);
      },
      (tx: any, error: any) => {
        console.log('Error fetching active types:', error);
      },
    );
  });
};

const getTransactions = (
  betdate: string,
  bettime: number,
  bettypeid: number,
  callback: (transactions: any[]) => void,
) => {
  const db = openDatabaseConnection();
  db.transaction((tx: any) => {
    tx.executeSql(
      'SELECT * FROM trans WHERE betdate = ? AND bettime = ? AND bettypeid = ?',
      [betdate, bettime, bettypeid],
      (tx: any, results: any) => {
        const rows = results.rows;
        const len = rows.length;
        const transactions: any[] = [];
        for (let i = 0; i < len; i++) {
          const transaction = rows.item(i);
          transactions.push(transaction);
        }
        callback(transactions);
      },
      (error: any) => {
        console.error('Error fetching transactions:', error);
      },
    );
  });
};

const getTransactionByTicketCode = (
  ticketcode: string,
  callback: (transaction: any) => void,
) => {
  const db = openDatabaseConnection();
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

const getBetsByTransaction = (
  transid: number,
  callback: (bets: Bet[]) => void,
) => {
  const db = openDatabaseConnection();
  db.transaction((tx: any) => {
    tx.executeSql(
      'SELECT * FROM bet WHERE transid = ?',
      [transid],
      (tx: any, results: any) => {
        const rows = results.rows;
        const len = rows.length;
        const bets: Bet[] = [];
        for (let i = 0; i < len; i++) {
          const {id, transid, betnumber, betnumberr, target, rambol, subtotal} =
            rows.item(i);
          bets.push({
            id: id,
            transid: transid,
            betNumber: betnumber,
            betNumberr: betnumberr,
            targetAmount: target,
            rambolAmount: rambol,
            subtotal: subtotal,
          });
        }
        callback(bets);
      },
      (error: any) => {
        console.error('Error fetching bets:', error);
      },
    );
  });
};

const getResult = (
  betDate: string,
  betTime: number,
  betTypeId: number,
  callback: (result: any) => void,
) => {
  const db = openDatabaseConnection();
  db.transaction((tx: any) => {
    tx.executeSql(
      'SELECT * FROM result WHERE betdate = ? AND bettime = ? AND bettypeid = ?',
      [betDate, betTime, betTypeId],
      (tx: any, results: any) => {
        const rows = results.rows;
        const len = rows.length;
        if (len > 0) {
          const result = rows.item(0);
          callback(result); // Pass the result to the result;
        } else {
          callback(null);
        }
      },
    );
  });
};

const getWinners = (
  betType: any,
  result: any,
  callback: (transactions: any[]) => void,
) => {
  const db = openDatabaseConnection();
  db.transaction((tx: any) => {
    tx.executeSql(
      'SELECT trans.ticketcode, trans.id, trans.status, trans.created_at, trans.trans_no, ' +
        'sum(CASE WHEN bet.betnumber = ? THEN (bet.target * ?) ELSE 0 END + CASE WHEN bet.betnumberr = ? THEN (bet.rambol * ?) ELSE 0 END) as total ' +
        'FROM bet LEFT OUTER JOIN trans ON bet.transid = trans.id ' +
        'WHERE trans.betdate = ? ' +
        'AND trans.bettime = ? ' +
        'AND trans.bettypeid = ? ' +
        'AND ((bet.betnumber = ? AND bet.target>0) OR (bet.betnumberr = ? AND bet.rambol>0)) ' +
        'GROUP BY trans.ticketcode',
      [
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
        const rows = results.rows;
        const len = rows.length;
        const transactions: any[] = [];
        for (let i = 0; i < len; i++) {
          const transaction = rows.item(i);
          if (transaction.total > 0) transactions.push(transaction);
        }
        callback(transactions);
      },
    );
  });
};

const getWinningTransactionBets = (
  transid: number,
  result: any,
  callback: (bets: any[]) => void,
) => {
  const db = openDatabaseConnection();
  db.transaction((tx: any) => {
    tx.executeSql(
      'SELECT * FROM bet WHERE transid = ? AND ((betnumber = ? AND target>0) OR (betnumberr = ? AND rambol>0))',
      [transid, result.result, result.resultr],
      (tx: any, results: any) => {
        const rows = results.rows;
        const len = rows.length;
        const bets: any[] = [];
        for (let i = 0; i < len; i++) {
          const bet = rows.item(i);
          bets.push({
            id: bet.id,
            betNumber: bet.betnumber,
            targetAmount: bet.target,
            rambolAmount: bet.rambol,
            subtotal: bet.subtotal,
          });
        }
        callback(bets);
      },
    );
  });
};

// const checkTransactionIfWinning = (
//   ticketcode: string,
//   callback: (isWinning: boolean) => void,

// )

const closeDatabaseConnection = () => {
  const db = openDatabaseConnection();
  db.close();
};

//Insert Functions
const insertTypes = (types: any) => {
  const db = openDatabaseConnection();
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

const insertTransaction = (
  transaction: Transaction,
  bets: Bet[],
  callback: (transactionId: number) => void,
) => {
  console.log('created_at', transaction.created_at);
  const db = openDatabaseConnection();
  db.transaction((tx: any) => {
    tx.executeSql(
      'INSERT INTO trans (ticketcode, transdata, betdate, bettime, bettypeid, trans_no, total, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
        callback(insertedId); // Pass the inserted ID back to the callback

        // Insert bets associated with the transaction
        bets.forEach((bet: Bet) => {
          tx.executeSql(
            'INSERT INTO bet (transid, tranno, betnumber, betnumberr, target, rambol, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)',
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
      },
    );
  });
};

const insertResult = (result: any, callback: (resultId: number) => void) => {
  const db = openDatabaseConnection();
  db.transaction((tx: any) => {
    tx.executeSql(
      'INSERT INTO result (bettypeid, result, resultr, betdate, bettime) VALUES (?, ?, ?, ?, ?)',
      [
        result.bettypeid,
        result.result,
        result.resultr,
        result.betdate,
        result.bettime,
      ],
      (tx: any, results: any) => {
        const insertedId = results.insertId;
        callback(insertedId);
      },
      (error: any) => {
        console.error('Error inserting result:', error);
      },
    );
  });
};

//Update Functions
const updateTransactionStatus = (transactionId: number, status: string) => {
  const db = openDatabaseConnection();
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
  callback: (transaction: any) => void,
) => {
  const db = openDatabaseConnection();
  db.transaction((tx: any) => {
    tx.executeSql(
      'SELECT * FROM trans WHERE betdate = ? AND bettime = ? AND bettypeid = ? ORDER BY trans_no DESC LIMIT 1',
      [betdate, bettime, bettypeid],
      (tx: any, results: any) => {
        const rows = results.rows;
        const len = rows.length;
        if (len > 0) {
          const transaction = rows.item(0);
          callback(transaction);
        } else {
          callback(null);
        }
      },
      (error: any) => {
        console.error('Error fetching transactions:', error);
      },
    );
  });
};

const getBetTypeById = (id: number, callback: (type: any) => void) => {
  const db = openDatabaseConnection();
  db.transaction((tx: any) => {
    tx.executeSql(
      'SELECT * FROM settings WHERE id = ?',
      [id],
      (tx: any, results: any) => {
        const rows = results.rows;
        const type = rows.item(0);
        callback(type);
      },
      (error: any) => {
        console.error('Error fetching transactions:', error);
      },
    );
  });
};

export {
  initializeDatabase,
  getActiveTypes,
  getTransactions,
  getTransactionByTicketCode,
  getLatestTransaction,
  getBetsByTransaction,
  getWinningTransactionBets,
  getWinners,
  getResult,
  insertTransaction,
  insertTypes,
  insertResult,
  updateTransactionStatus,
  closeDatabaseConnection,
};
