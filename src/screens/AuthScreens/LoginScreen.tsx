import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
} from 'react-native';
import {ActivityIndicator, Text} from 'react-native-paper';
import {useDispatch, useSelector} from 'react-redux';
import {StackActions, useNavigation} from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Styles from './Styles';
import Colors from '../../Styles/Colors';
import Images from '../../Styles/Images';
import {userActions} from '../../store/actions';
import LinearGradient from 'react-native-linear-gradient';
import {launchImageLibrary} from 'react-native-image-picker';
import RNQRGenerator from 'rn-qr-generator';
import {PermissionsAndroid} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import axios from 'axios';
import {appConfig} from '../../config/appConfig';
import _ from 'lodash';
import { checkInternetConnection } from "../../helper";
import debounce from "lodash/debounce";

const LoginScreen = props => {
  const internetStatusCheck = useRef(checkInternetConnection());
  const [showLogin, setShowLogin] = useState(false);
  const dispatch = useDispatch();
  const [loggingIn, setLoggingIn] = useState(false);
  const [showQRCam, setShowQRCam] = useState(false);
  const [enableQRCam, setEnableQRCam] = useState(false);
  const [pinCode, onChangePinCode] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const cameraDevice = useCameraDevice('back');

  async function requestCameraPermission() {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'App needs access to your camera.',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Camera permission granted');
        // You can now proceed to use the camera
      } else {
        console.log('Camera permission denied');
        // Handle denied permission
      }
    } catch (err) {
      console.warn(err);
    }
  }

  function handleSubmit() {
    Keyboard.dismiss();
    AsyncStorage.removeItem('API_URL');
    if (pinCode.length && !loggingIn) {
      try {
        setLoggingIn(true);
        axios
          .post(appConfig.apiUrl + 'login', {
            pinCode: pinCode,
          })
          .then((response: any) => {
            console.log(response.data);
            if (response?.data?.token) {
              dispatch(
                userActions.login(response.data.agent, response.data.token),
              );
              setLoggingIn(false);
            } else {
              alert('Invalid QR code');
            }
          });
      } catch (e) {
        alert(e.message);
      }
    } else {
      alert('username & password are required');
    }
  }

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false),
    );

    requestCameraPermission();
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

  const processQR = async (qr_token: string) => {
    setLoggingIn(true);
    console.log('processQR');
    setTimeout(function(){
      console.log('timeout');
      try {
        console.log('axios');
        axios
          .post(appConfig.apiUrl + 'login', {
            encodedString: qr_token,
          })
          .then((response: any) => {
            console.log(response.data);
            if (response?.data?.token) {
              dispatch(
                userActions.login(response.data.agent, response.data.token),
              );
              setLoggingIn(false);
            } else {
              setLoggingIn(false);
              alert('Invalid QR code');
            }
          });
        } catch (e) {
          alert(e.message);
        }
    }, 1000);
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      if (!internetStatusCheck.current.isConnected()) {
        Alert.alert('No internet connection');
      }
      setEnableQRCam(false);
      if (codes[0].value[codes[0].value.length - 12] === ':') {
        setEnableQRCam(false);
        setTimeout(async () => {
          setShowQRCam(false);
          console.log('timeout')
        }, 300);
        codes[0].value = codes[0].value.substring(
          0,
          codes[0].value.length - 12,
        );
        debouncedProcessQr(codes[0].value as string);
      } else Alert.alert('Invalid QR code');
    },
  });

  const debouncedProcessQr = debounce(processQR, 200)

  const hideQRCam = () => {
    setShowQRCam(false);
    setEnableQRCam(false);
  }

  if (showQRCam) {
    return (
      <View style={{flex: 1}}>
        {cameraDevice && <Camera
          codeScanner={codeScanner}
          style={Styles.cameraStyle}
          device={cameraDevice}
          isActive={enableQRCam}
        />}
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
              onPress={() => hideQRCam()}>
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
            onPress={() => {
              setEnableQRCam(true);
              setShowQRCam(true);
            }}
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
                  onChangeText={onChangePinCode}
                  value={pinCode}
                  placeholder="Pincode"
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
