import {appConfig} from '../../config/appConfig';

export const userService = {
  login,
  logout,
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

async function logout({account_id, device_id, token}) {
  const requestOptions = {
    method: 'PUT',
    headers: {'X-Auth-Token': token},
  };
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
