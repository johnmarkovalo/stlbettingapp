import SQLite from 'react-native-sqlite-storage';

export const clearDatabase = async () => {
  try {
    const db = SQLite.openDatabase({name: 'zian.db', location: 'default'});

    return new Promise((resolve, reject) => {
      db.transaction(
        tx => {
          // Drop all tables
          tx.executeSql('DROP TABLE IF EXISTS settings');
          tx.executeSql('DROP TABLE IF EXISTS trans');
          tx.executeSql('DROP TABLE IF EXISTS bet');
          tx.executeSql('DROP TABLE IF EXISTS result');
        },
        error => {
          console.error('Error clearing database:', error);
          reject(error);
        },
        () => {
          console.log('Database cleared successfully');
          db.close();
          resolve(true);
        },
      );
    });
  } catch (error) {
    console.error('Error opening database for clearing:', error);
    throw error;
  }
};
