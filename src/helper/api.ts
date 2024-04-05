import axios from 'axios';

const syncBetTypesAPI = async (
  url: string,
  token: string,
  callback: (types: any) => void,
) => {
  axios
    .get(url + 'betTypes', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    .then(response => {
      callback(response.data);
    });
};

export {syncBetTypesAPI};
