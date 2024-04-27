import axios from 'axios';
import {appConfig} from '../config/appConfig';
const syncBetTypesAPI = async (token: string) => {
  try {
    console.log('checking server db');

    const response = await axios.get(appConfig.apiUrl + 'betTypes', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error(error.message);
    throw error;
  }
};

const getTransactionsAPI = async (
  token: string,
  date: string,
  draw: number,
  type: number,
  keycode?: string,
) => {
  console.log('checking server db');
  try {
    const response = await axios.get(
      appConfig.apiUrl + 'transactions/' + keycode + '/betTypes/' + type,
      {
        params: {date, draw},
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error(error.message);
    throw error;
  } finally {
    console.log('done checking server db');

  }
};

const sendTransactionAPI = async (token: string, transaction) => {
  console.log('transaction', {...transaction});
  const response = await axios.post(
    appConfig.apiUrl + 'transactions',
    {...transaction},
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );

  console.log('Transaction sent successfully');
  return response.data;
};

const syncResultAPI = async (
  token: string,
  type: number,
  draw: number,
  date: string,
) => {
  console.log('checking server db');
  console.log('passed params', type, draw, date);
  try {
    const response = await axios.get(
      appConfig.apiUrl + 'results/' + type + '/draws/' + draw,
      {
        params: {date},
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (JSON.stringify(response.data) !== '{}') {
      return response.data; // Return the result if it's not empty
    } else {
      return null; // Return null if the response data is empty
    }
  } catch (error) {
    console.error('Error fetching results:', error);
    throw error; // Re-throw the error to allow callers to handle it
  }
};

const checkTransactionAPI = async (ticketcode: string, token: string) => {
  return new Promise((resolve, reject) => {
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
          resolve(response.data);
        } else resolve(null);
      });
  });
};

export {
  syncBetTypesAPI,
  getTransactionsAPI,
  sendTransactionAPI,
  syncResultAPI,
  checkTransactionAPI,
};
