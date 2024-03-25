import {userConstants, alertConstants, provConstants} from '../constants';
import {userService} from '../services';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const userActions = {
  init,
  loginUser,
  logout,
  subscribe,
  unsubscribe,
  updateSubscribe,
  addFavorite,
  removeFavorite,
  updateConf,
  setIceServer,
  updateUser,
  updateDND,
  updateContacts,
};

function init() {
  return (dispatch, getState) => {
    dispatch(request());
    const user = getState().auth.user;
    if (user) {
      userService.getAllAppData(user.token).then(
        async data => {
          dispatch(success(user));
          console.log('INIT DATA: ', data?.data);
          if (data?.data) {
            dispatch(userDataSuccess(data?.data));
          }
        },
        error => {
          dispatch(userDataError(error));
        },
      );
    } else {
      // @ts-ignore
      dispatch(failure('init Failed'));
    }
  };

  function request() {
    return {type: userConstants.INIT_REQUEST};
  }
  function success(user) {
    return {type: userConstants.INIT_SUCCESS, user};
  }
  function failure() {
    return {type: userConstants.INIT_FAILURE};
  }

  function userDataSuccess(allAppData) {
    return {type: provConstants.UPDATE_SUCCESS, allAppData};
  }

  function userDataError(error) {
    return {type: provConstants.UPDATE_FAILURE, error};
  }
}

function updateConf() {
  return (dispatch, getState) => {
    const user = getState().auth.user;
    if (user) {
      // userService.checkConf(user).then(
      //   async data => {
      //     if (data) {
      //       Object.assign(user, data);
      //     }
      //     dispatch(success(user));
      //   },
      //   error => {
      //     // alert(error)
      //   },
      // );
    }
  };

  // function success(user) {
  //   return { type: userConstants.INIT_SUCCESS, user };
  // }
}

function updateContacts(contacts) {
  return (dispatch, getState) => {
    const allAppData = getState().prov.allAppData;
    if (allAppData) {
      // @ts-ignore
      dispatch(
        userDataSuccess({
          ...allAppData,
          contacts: contacts,
        }),
      );
    }
  };

  function userDataSuccess(allAppData) {
    return {type: provConstants.UPDATE_SUCCESS, allAppData};
  }
}

function updateDND(dnd) {
  return (dispatch, getState) => {
    const allAppData = getState().prov.allAppData;
    if (allAppData) {
      // @ts-ignore
      dispatch(
        userDataSuccess({
          ...allAppData,
          dnd: dnd,
        }),
      );
    }
  };

  function userDataSuccess(allAppData) {
    return {type: provConstants.UPDATE_SUCCESS, allAppData};
  }
}

// function updateDND(dnd) {
//   return (dispatch, getState) => {
//     const user = getState().auth.user;
//     const allAppData = getState().prov.allAppData;
//     if (allAppData) {
//       userService.updateDND(user.token, dnd).then(
//         async (data) => {
//           if (data.success && data?.data) {
//             // @ts-ignore
//             dispatch(
//               userDataSuccess({
//                 ...allAppData,
//                 dnd: data?.data,
//               })
//             );
//           }
//         },
//         (error) => {
//           console.log(
//             "--------------UPDATE DND ERROR------------------",
//             error
//           );
//         }
//       );
//     }
//   };

//   function userDataSuccess(allAppData) {
//     return { type: provConstants.UPDATE_SUCCESS, allAppData };
//   }
// }

function updateUser(payload) {
  return (dispatch, getState) => {
    const user = getState().auth.user;
    if (user) {
      Object.assign(user, payload);
      dispatch(success(user));
    }
  };

  function success(user) {
    return {type: userConstants.INIT_SUCCESS, user};
  }
}

function setIceServer(iceSer) {
  return {type: userConstants.SET_ICE_SERVER, iceServer: iceSer};
}

const presentWelcomeNotification = async () => {
  // Create a channel
  const channelId = await notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
  });

  // Display a notification
  await notifee.displayNotification({
    title: 'Welcome to Vocphone',
    android: {
      channelId,
      color: '#DE2886',
      pressAction: {
        id: 'default',
      },
    },
    ios: {
      foregroundPresentationOptions: {
        alert: true,
        badge: true,
        sound: true,
      },
    },
  });
};

function loginUser(authHeader) {
  console.log('login action');
  return async dispatch => {
    const NOT_TOKEN = await AsyncStorage.getItem('NOT_TOKEN');
    const M_NOT_TOKEN = await AsyncStorage.getItem('M_NOT_TOKEN');
    const fcm_token = await messaging().getToken();

    dispatch(request());
    userService.login(authHeader).then(
      async user => {
        let notificationToken = NOT_TOKEN ? JSON.parse(NOT_TOKEN).token : null;
        user.notificationToken = notificationToken;
        user.fcm_token = fcm_token;
        user.m_pn_token = M_NOT_TOKEN
          ? JSON.parse(M_NOT_TOKEN).m_pn_token
          : null;

        userService.getAllAppData(user.token).then(
          async data => {
            dispatch(success(user));
            if (data?.data) {
              dispatch(userDataSuccess(data?.data));
            }

            try {
              if (user?.pcConfig?.iceServers?.length > 0) {
                dispatch(setIceServer(user.pcConfig.iceServers[0]));
              }
            } catch (e) {
              console.log('ICE SET ERROR: ', e);
            }

            // @ts-ignore
            global.initialLogin = true;
            presentWelcomeNotification();
          },
          error => {
            console.log('ERROR: ', error);
            dispatch(userDataError(error));
          },
        );
      },
      error => {
        console.log(error);
        Sentry.captureException(error);
        dispatch(failure(error.toString()));
        alert('Login failed!');
      },
    );
  };

  function request() {
    return {type: userConstants.LOGIN_REQUEST};
  }
  function success(user) {
    return {type: userConstants.LOGIN_SUCCESS, user};
  }
  function failure(error) {
    return {type: userConstants.LOGIN_FAILURE, error};
  }

  function userDataSuccess(allAppData) {
    return {type: provConstants.UPDATE_SUCCESS, allAppData};
  }

  function userDataError(error) {
    return {type: provConstants.UPDATE_FAILURE, error};
  }
}

function logout() {
  return (dispatch, getState) => {
    const user = getState().auth.user;
    dispatch({type: alertConstants.SHOW});
    userService.logout(user).then(
      async () => {
        dispatch({type: alertConstants.HIDE});
        dispatch({type: userConstants.LOGOUT});
      },
      error => {
        alert(error);
      },
    );
  };
}

function addFavorite(fav) {
  return dispatch => {
    dispatch({type: userConstants.ADD_FAVORITE, fav});
  };
}

function removeFavorite(id) {
  return dispatch => {
    dispatch({type: userConstants.REMOVE_FAVORITE, id});
  };
}

function subscribe(sub) {
  return dispatch => {
    dispatch({type: userConstants.ADD_SUBSCRIBER, sub});
  };
}

function unsubscribe(extension) {
  return dispatch => {
    dispatch({type: userConstants.REMOVE_SUBSCRIBER, extension});
  };
}

function updateSubscribe(sub) {
  return dispatch => {
    dispatch({type: userConstants.UPDATE_SUBSCRIBER, sub});
  };
}
