import {
  PermissionsAndroid,
  Platform,
  ToastAndroid,
  Alert,
  Linking,
} from 'react-native';
import {request, check, PERMISSIONS, RESULTS} from 'react-native-permissions';

const permissions = [
  {
    name: PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    title: 'Phone State permission',
    message:
      'In order to make VoIP calls Vocphone would like to access your phone state.',
  },
];

const showToast = message => {
  ToastAndroid.showWithGravity(message, ToastAndroid.LONG, ToastAndroid.CENTER);
};

export const getPermission = async permission => {
  try {
    const granted = await PermissionsAndroid.request(permission.name, {
      title: permission.title,
      message: permission.message,
      buttonNegative: "I don't want to use Vocphone",
      buttonPositive: 'Allow',
    });

    return granted;
  } catch (err) {
    showToast(
      'Something is not right with your android permissions. Vocphone will not work properly.',
    );
    return null;
  }
};

export const askForPermissions = async function () {
  if (Platform.OS === 'android') {
    for (const permission of permissions) {
      await getPermission(permission);
    }
  }
};

export const checkPhonePermission = async () => {
  return true;
};

export const checkBluetoothPermission = async () => {
  return check(PERMISSIONS.ANDROID.BLUETOOTH_CONNECT).then(result => {
    console.log('CHECK 1 ', result);
    return request(PERMISSIONS.ANDROID.BLUETOOTH_CONNECT).then(result => {
      console.log('CHECK 2 ', result);
      return result === 'granted' ? true : false;
    });
  });
};

export const checkNotificationPermission = async () => {
  return check(PERMISSIONS.ANDROID.POST_NOTIFICATIONS).then(result => {
    console.log(result);
    return request(PERMISSIONS.ANDROID.POST_NOTIFICATIONS).then(result => {
      console.log('CHECK 2 ', result);
      return result === 'granted' ? true : false;
    });
  });
};

export const showPermissionAlert = msg => {
  Alert.alert('Alert', msg, [
    {
      text: 'Settings',
      onPress: () => {
        Linking.openSettings();
      },
    },
    {
      text: 'Cancel',
    },
  ]);
};
