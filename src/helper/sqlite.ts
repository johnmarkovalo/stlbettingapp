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
        '(id INTEGER PRIMARY KEY AUTOINCREMENT, tranno INTEGER, ticketcode TEXT, transdata TEXT,' +
        "bettypeid INTEGER, betdate DATE, bettime TEXT, status TEXT DEFAULT 'saved', created_at DATE DEFAULT CURRENT_TIMESTAMP)",
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
  });
};

const dropTables = () => {
  const db = openDatabaseConnection();
  db.transaction((tx: any) => {
    tx.executeSql('DROP TABLE IF EXISTS settings');
    tx.executeSql('DROP TABLE IF EXISTS trans');
    tx.executeSql('DROP TABLE IF EXISTS bet');
    tx.executeSql('DROP TABLE IF EXISTS result');
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

const closeDatabaseConnection = () => {
  const db = openDatabaseConnection();
  db.close();
};

export {initializeDatabase, getActiveTypes, closeDatabaseConnection};
