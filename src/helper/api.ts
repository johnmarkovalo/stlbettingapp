import axios from 'axios';
import {appConfig} from '../config/appConfig';
const syncBetTypesAPI = async (
  token: string,
  callback: (types: any) => void,
) => {
  axios
    .get(appConfig.apiUrl + 'betTypes', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    .then(response => {
      callback(response.data);
    });
};

const sendTransactionAPI = async (
  token: string,
  transaction,
  callback: (result: any) => void,
) => {
  console.log('transaction', {...transaction});
  axios
    .post(
      appConfig.apiUrl + 'transactions',
      {...transaction},
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )
    .then(response => {
      callback(response.data);
      console.log('Transaction sent successfully');
    })
    .catch(error => {
      console.error(error.message);
    });
};

const syncResultAPI = async (
  token: string,
  type: number,
  draw: number,
  date: string,
  callback: (types: any) => void,
) => {
  console.log('checking server db');
  axios
    .get(appConfig.apiUrl + 'results/' + type + '/draws/' + draw, {
      params: {date},
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    .then(response => {
      if (JSON.stringify(response.data) !== '{}') {
        callback(response.data);
      } else callback(null);
    });
};

const checkTransactionAPI = async (
  ticketcode: string,
  token: string,
  callback: (types: any) => void,
) => {
  console.log('checking server db');
  axios
    .get(appConfig.apiUrl + 'transactions/scan/' + ticketcode, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    .then(response => {
      if (JSON.stringify(response.data) !== '{}') {
        callback(response.data);
      } else callback(null);
    });
};

export {
  syncBetTypesAPI,
  sendTransactionAPI,
  syncResultAPI,
  checkTransactionAPI,
};
