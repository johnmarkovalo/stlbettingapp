import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import {ActivityIndicator, Text} from 'react-native-paper';
// import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Styles from './Styles';
import Colors from '../../Styles/Colors';
import Images from '../../Styles/Images';
// import {userActions} from '../../store/actions';
import LinearGradient from 'react-native-linear-gradient';
import {launchImageLibrary} from 'react-native-image-picker';
import RNQRGenerator from 'rn-qr-generator';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';

const LoginScreen = props => {
  const [showLogin, setShowLogin] = useState(false);
  // const dispatch = useDispatch();
  // const {loggingIn} = useSelector(state => state.auth);
  const {loggingIn} = useRef(false);
  const [enableQRCam, setEnableQRCam] = useState(false);
  const [username, onChangeUsername] = useState('');
  const [password, onChangePassword] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const cameraDevice = useCameraDevice('back');

  function handleSubmit() {
    Keyboard.dismiss();
    AsyncStorage.removeItem('API_URL');
    if (username.length && password.length && !loggingIn) {
      const combined = `${username}:${password}`;
      const base64encoded = Buffer.from(combined).toString('base64');
      // dispatch(
      //   // @ts-ignore
      //   userActions.loginUser({Authorization: `Basic ${base64encoded}`}),
      // );
    } else {
      alert('username & password are required');
    }
  }

  useEffect(() => {
    (async () => {
      AsyncStorage.removeItem('API_URL');
    })();
  }, []);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false),
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const uploadQR = async () => {
    setEnableQRCam(false);
    const result = await launchImageLibrary({
      mediaType: 'photo',
    });

    if (result.assets && result.assets.length > 0) {
      RNQRGenerator.detect({
        uri: result.assets[0].uri,
      })
        .then(response => {
          const {values} = response; // Array of detected QR code values. Empty if nothing found.
          console.log(values);
          if (values && values.length > 0) {
            const qr_token = values[0];
            processQR(qr_token);
          } else {
            alert('Cannot detect QR code in image');
          }
        })
        .catch(error => {
          console.log(error);
          alert('Cannot detect QR code in image');
        });
    }
  };

  const splitUrlAndToken = inputString => {
    // Check if ':' is present in the string
    if (!inputString.includes(':')) {
      throw new Error('String does not contain a colon (:) separator.');
    }

    // Find the last index of ':'
    const lastIndex = inputString.lastIndexOf(':');

    // Extract the URL and token based on the last ':' position
    const url = inputString.substring(0, lastIndex);
    const token = inputString.substring(lastIndex + 1);

    // Validate the URL (basic validation for demonstration purposes)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('Invalid URL format.');
    }

    // Validate the token (example validation, adjust as needed)
    if (token.length === 0) {
      throw new Error('Token is empty.');
    }

    // Further validations can be added here as per requirements

    return {url, token};
  };

  const processQR = async qr_token => {
    try {
      const {url, token} = splitUrlAndToken(qr_token);

      console.log(`Scanned ${JSON.stringify(qr_token)} codes!`);
      // save the base API url
      // await AsyncStorage.setItem('API_URL', url);
      // @ts-ignore
      // dispatch(userActions.loginUser({Authorization: `Bearer ${token}`}));
    } catch (e) {
      alert(e.message);
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      setEnableQRCam(false);
      processQR(codes[0].value);
    },
  });

  if (enableQRCam) {
    return (
      <View style={{flex: 1}}>
        <Camera
          codeScanner={codeScanner}
          style={Styles.cameraStyle}
          device={cameraDevice}
          isActive={true}
        />
        <View
          style={{
            flex: 1,
            width: '100%',
            justifyContent: 'flex-end',
          }}>
          <LinearGradient
            colors={['#104156', '#041F2B']}
            style={[Styles.loginBtn, {width: '50%'}]}>
            <TouchableOpacity style={Styles.loginBtnInner} onPress={uploadQR}>
              <Text style={Styles.loginBtnText}>Select a QR Image</Text>
            </TouchableOpacity>
          </LinearGradient>
          <LinearGradient
            colors={['#104156', '#041F2B']}
            style={[Styles.loginBtn, {width: '50%'}]}>
            <TouchableOpacity
              style={Styles.loginBtnInner}
              onPress={() => setEnableQRCam(false)}>
              <Text style={Styles.loginBtnText}>Back</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    );
  }

  return (
    <View style={Styles.backgroundWrapper}>
      <KeyboardAvoidingView
        style={Styles.mainContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View>
          {!keyboardVisible && (
            <View style={[Styles.containerGroup, Styles.topBar]}>
              <FastImage style={Styles.logoIcon} source={Images.zianLogo} />
            </View>
          )}
          <TouchableOpacity
            onPress={() => setEnableQRCam(true)}
            style={[Styles.containerGroup, Styles.qrContainer]}>
            <FastImage
              style={Styles.qrIcon}
              source={Images.qrCode}
              resizeMode={FastImage.resizeMode.contain}
            />
          </TouchableOpacity>
          <View style={[Styles.containerGroup, Styles.qrTextContainer]}>
            <Text style={Styles.logoText}>{'Login with QR code'}</Text>
            <TouchableOpacity onPress={() => setShowLogin(true)}>
              <Text style={Styles.qrText2}>Having trouble.</Text>
            </TouchableOpacity>
          </View>
          {showLogin && (
            <View>
              <View style={Styles.InputContainer}>
                <TextInput
                  style={Styles.loginInput}
                  onChangeText={onChangeUsername}
                  value={username}
                  placeholder="Username"
                  placeholderTextColor={Colors.darkGrey}
                />
              </View>
              <View style={Styles.InputContainer}>
                <TextInput
                  style={Styles.loginInput}
                  onChangeText={onChangePassword}
                  value={password}
                  secureTextEntry={true}
                  placeholder="Password"
                  placeholderTextColor={Colors.darkGrey}
                />
              </View>
              <View style={Styles.InputContainer}>
                <LinearGradient
                  colors={['#C24B4B', '#FF0000']}
                  style={Styles.loginBtn}>
                  <TouchableOpacity
                    style={Styles.loginBtnInner}
                    onPress={handleSubmit}>
                    <Text style={Styles.loginBtnText}>Login</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </View>
          )}

          {loggingIn && <ActivityIndicator />}
        </View>
        <View style={[Styles.containerGroup, Styles.bottomBar]}>
          {/* <FastImage
            style={Styles.imageLeft}
            source={Images.leftImage}
            resizeMode={FastImage.resizeMode.contain}
          />
          <FastImage
            style={Styles.imageRight}
            source={Images.unidenLogo}
            resizeMode={FastImage.resizeMode.contain}
          /> */}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default LoginScreen;
