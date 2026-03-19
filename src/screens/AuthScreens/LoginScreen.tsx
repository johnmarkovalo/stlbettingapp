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
import {useDispatch} from 'react-redux';
import FastImage from 'react-native-fast-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Styles from './Styles';
import {palette} from '../../theme/colors';
import Images from '../../Styles/Images';
import {typesActions, userActions} from '../../store/actions';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';
import {appConfig} from '../../config/appConfig';
import {formatBetTypes} from '../../helper';
import {syncBetTypesAPI} from '../../helper/api';
import {insertTypes} from '../../database';

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = () => {
  const dispatch = useDispatch();
  const [pinCode, setPinCode] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Auto focus the input on mount
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  async function syncSettings(token: string) {
    try {
      const types = await syncBetTypesAPI(token);
      if (types && types.length > 0) {
        insertTypes(types);
        Alert.alert('Success', 'Settings are synced');
        dispatch(typesActions.update(formatBetTypes(types)));
      } else {
        Alert.alert(
          'Sync Warning',
          'Login successful but failed to load bet types. Please go to Settings and tap "Sync Settings".',
        );
      }
    } catch (error: any) {
      console.error('Sync settings error:', error);
      Alert.alert(
        'Sync Warning',
        'Login successful but failed to sync settings. Please go to Settings and tap "Sync Settings".',
      );
    }
  }

  async function handleLogin() {
    Keyboard.dismiss();
    
    if (!pinCode.trim()) {
      Alert.alert('Error', 'Please enter your pincode');
      return;
    }

    if (loggingIn) {
      return;
    }

    setLoggingIn(true);
    AsyncStorage.removeItem('API_URL');

    try {
      const response = await axios.post(appConfig.apiUrl + 'login', {
        pinCode: pinCode.trim(),
      });

      if (response?.data?.token) {
        syncSettings(response.data.token);
        dispatch(userActions.login(response.data.agent, response.data.token));
      } else {
        Alert.alert('Error', 'Invalid pincode');
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'An error occurred. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoggingIn(false);
    }
  }

  return (
    <View style={Styles.backgroundWrapper}>
      <KeyboardAvoidingView
        style={Styles.mainContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={Styles.loginContent}>
          {/* Logo */}
          <View style={Styles.logoContainer}>
            <FastImage style={Styles.logoIcon} source={Images.zianLogo} />
          </View>

          {/* Title */}
          <Text style={Styles.loginTitle}>Welcome</Text>
          <Text style={Styles.loginSubtitle}>Enter your pincode to continue</Text>

          {/* Pincode Input */}
          <View style={Styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={Styles.pincodeInput}
              onChangeText={setPinCode}
              value={pinCode}
              placeholder="Enter Pincode"
              placeholderTextColor={palette.gray[400]}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={10}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          {/* Login Button */}
          <View style={Styles.inputWrapper}>
            <LinearGradient
              colors={[palette.primary[500], palette.primary[700]]}
              style={Styles.loginButton}>
              <TouchableOpacity
                style={Styles.loginButtonInner}
                onPress={handleLogin}
                disabled={loggingIn}
                activeOpacity={0.8}>
                {loggingIn ? (
                  <ActivityIndicator color={palette.white} size="small" />
                ) : (
                  <Text style={Styles.loginButtonText}>Login</Text>
                )}
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>

        {/* Bottom spacer for keyboard */}
        <View style={Styles.bottomSpacer} />
      </KeyboardAvoidingView>
    </View>
  );
};

export default LoginScreen;
