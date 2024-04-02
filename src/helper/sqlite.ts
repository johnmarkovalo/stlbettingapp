import SQLite, {ResultSetRowList} from 'react-native-sqlite-storage';
import {formatTime} from './functions';
import Type from '../models/Type';
import Bet from '../models/Bet';
import Transaction from '../models/Transaction';

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
        "bettypeid INTEGER, betdate DATE, bettime INTEGER, status TEXT DEFAULT 'saved', created_at DATE DEFAULT CURRENT_TIMESTAMP)",
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
        '(id INTEGER PRIMARY KEY AUTOINCREMENT, gametypeid INTEGER, result TEXT, resultr TEXT, gamedate DATE,' +
        'gametime TEXT, created_at DATE DEFAULT CURRENT_TIMESTAMP)',
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
      [1, '4064–3336–6537–3166', 20, '247 10 10', '2', '2024-04-02', 3],
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
            id,
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

const inserTypes = (
  active: string,
  bettype: string,
  bettypeid: number,
  wintar: number,
  winram: number,
  winram2: number,
  maxlength: number,
  cnt: string,
  perc: string,
  divisible: number,
  limits: number,
  capping: number,
  start11: number,
  start11m: number,
  end11: number,
  end11m: number,
  start4: number,
  start4m: number,
  end4: number,
  end4m: number,
  start9: number,
  start9m: number,
  end9: number,
  end9m: number,
) => {
  const db = openDatabaseConnection();
  db.transaction((tx: any) => {
    tx.executeSql(
      'SELECT 1 FROM settings WHERE bettypeid=?',
      [bettypeid],
      (tx: any, results: any) => {
        const cs = results.rows;
        const cv = {
          active: active,
          bettype: bettype,
          wintar: wintar,
          winram: winram,
          winram2: winram2,
          maxlength: maxlength,
          cnt: cnt,
          perc: perc,
          divisible: divisible,
          limits: limits,
          capping: capping,
          bettypeid: bettypeid,
          start11: start11,
          start11m: start11m,
          end11: end11,
          end11m: end11m,
          start4: start4,
          start4m: start4m,
          end4: end4,
          end4m: end4m,
          start9: start9,
          start9m: start9m,
          end9: end9,
          end9m: end9m,
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
          tx.executeSql(
            'UPDATE settings SET active=?, bettype=?, wintar=?, winram=?, winram2=?, maxlength=?, cnt=?, perc=?, divisible=?, limits=?, capping=?, start11=?, start11m=?, end11=?, end11m=?, start4=?, start4m=?, end4=?, end4m=?, start9=?, start9m=?, end9=?, end9m=? WHERE bettypeid=?',
            [...Object.values(cv), bettypeid],
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

const closeDatabaseConnection = () => {
  const db = openDatabaseConnection();
  db.close();
};

export {
  initializeDatabase,
  getActiveTypes,
  getTransactions,
  getBetsByTransaction,
  closeDatabaseConnection,
};
