/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';
// import {checkPhonePermission, showPermissionAlert} from './src/helper';

// const phonePermission = await checkPhonePermission();
// if (!phonePermission) {
//   console.log('[BG HEADLESS] newRTCSession Permission not allowed');
//   showPermissionAlert(
//     'To get calls, Vocphone needs to access to your phone state. Tap settings and turn on Phone',
//   );
// }

AppRegistry.registerComponent(appName, () => App);
