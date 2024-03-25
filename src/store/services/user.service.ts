import {appConfig} from '../../config/appConfig';

export const userService = {
  login,
  logout,
  checkConf,
  updateNotificationToken,
  getAllAppData,
  updateDND,
};

async function login(authHeader) {
  const requestOptions = {
    method: 'POST',
    headers: authHeader,
  };

  const BaseURL = await appConfig.getApiUrl();

  console.log('--------------BASE URL------------------', BaseURL);

  console.log(requestOptions);

  return fetch(`${BaseURL}${appConfig.apiPathPrefix}/loginQr`, requestOptions)
    .then(handleResponse)
    .then(data => {
      console.log('--------------LOGIN SUCCESS------------------', data);
      if (data.token) {
        return data;
      }

      throw 'Login Failed';
    });
}

async function updateNotificationToken(id, params, token) {
  const requestOptions = {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  };

  console.log(requestOptions);

  return fetch(`https://cyberely.live:5000/users/${id}`, requestOptions)
    .then(res => res.json())
    .then(data => console.log(data));
}

async function checkConf({account_id, device_id, token}) {
  const requestOptions = {
    method: 'GET',
    headers: {'X-Auth-Token': token},
  };
}

async function logout({account_id, device_id, token}) {
  const requestOptions = {
    method: 'PUT',
    headers: {'X-Auth-Token': token},
  };
}

async function getAllAppData(token) {
  const requestOptions = {
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
  };

  const BaseURL = await appConfig.getApiUrl();

  console.log('--------------BASE URL------------------', BaseURL);

  return fetch(`${BaseURL}${appConfig.apiPathPrefix}`, requestOptions)
    .then(handleResponse)
    .then(data => {
      console.log(
        '--------------GET ALL APP DATA SUCCESS------------------',
        data,
      );
      if (data) {
        return data;
      }

      throw 'Loading App Data Failed';
    });
}

async function updateDND(token, value) {
  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify({mobile: value}),
  };

  const BaseURL = await appConfig.getApiUrl();

  console.log('--------------BASE URL------------------', BaseURL);

  return fetch(`${BaseURL}${appConfig.apiPathPrefix}/dnd`, requestOptions)
    .then(handleResponse)
    .then(data => {
      console.log('--------------UPDATE DND SUCCESS------------------', data);
      if (data) {
        return data;
      }

      throw 'Update DND Failed';
    });
}

function handleResponse(response) {
  return response.text().then(text => {
    const data = text && JSON.parse(text);
    if (!response.ok) {
      const error = (data && data.message) || response.statusText;
      return Promise.reject(error);
    }

    return data;
  });
}
