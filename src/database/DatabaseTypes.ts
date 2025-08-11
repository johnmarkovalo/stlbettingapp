export interface DatabaseConfig {
  name: string;
  location: string;
}

export interface DatabaseTransaction {
  executeSql: (
    sqlStatement: string,
    arguments?: any[],
    callback?: (transaction: any, resultSet: any) => void,
    errorCallback?: (transaction: any, error: any) => void,
  ) => void;
}

export interface ResultSet {
  rows: {
    length: number;
    item: (index: number) => any;
    raw: () => any[];
  };
  insertId?: number;
}

export interface DatabaseError {
  message: string;
  code?: number;
}

// Database table names
export const TABLES = {
  SETTINGS: 'settings',
  TRANS: 'trans',
  BET: 'bet',
  RESULT: 'result',
} as const;

// Database column names
export const COLUMNS = {
  SETTINGS: {
    ID: 'id',
    ACTIVE: 'active',
    BETTYPE: 'bettype',
    BETTYPEID: 'bettypeid',
    LIMITS: 'limits',
    CAPPING: 'capping',
    WINTAR: 'wintar',
    WINRAM: 'winram',
    WINRAM2: 'winram2',
    MAXLENGTH: 'maxlength',
    CNT: 'cnt',
    PERC: 'perc',
    DIVISIBLE: 'divisible',
    START11: 'start11',
    START11M: 'start11m',
    END11: 'end11',
    END11M: 'end11m',
    START4: 'start4',
    START4M: 'start4m',
    END4: 'end4',
    END4M: 'end4m',
    START9: 'start9',
    START9M: 'start9m',
    END9: 'end9',
    END9M: 'end9m',
    CREATED_AT: 'created_at',
  },
  TRANS: {
    ID: 'id',
    TRANS_NO: 'trans_no',
    TICKETCODE: 'ticketcode',
    TOTAL: 'total',
    TRANS_DATA: 'trans_data',
    BETTYPEID: 'bettypeid',
    BETDATE: 'betdate',
    BETTIME: 'bettime',
    STATUS: 'status',
    CREATED_AT: 'created_at',
  },
  BET: {
    ID: 'id',
    TRANSID: 'transid',
    TRANNO: 'tranno',
    BETNUMBER: 'betnumber',
    BETNUMBERR: 'betnumberr',
    TARGET: 'target',
    RAMBOL: 'rambol',
    SUBTOTAL: 'subtotal',
    STATUS: 'status',
    CREATED_AT: 'created_at',
  },
  RESULT: {
    ID: 'id',
    BETTYPEID: 'bettypeid',
    RESULT: 'result',
    RESULTR: 'resultr',
    BETDATE: 'betdate',
    BETTIME: 'bettime',
    CREATED_AT: 'created_at',
  },
} as const;

// Database status values
export const STATUS = {
  SAVED: 'saved',
  SYNCED: 'synced',
  PENDING: 'pending',
  ERROR: 'error',
} as const;

// Database indexes
export const INDEXES = {
  TICKETCODE: 'index_ticketcode',
  TRANS_COMPOSITE: 'trans_composite_index',
  RESULT_COMPOSITE: 'result_composite_index',
} as const;
