import {StyleSheet, Dimensions} from 'react-native';
import Colors from '../../Styles/Colors';

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

const widthScreen = Dimensions.get('window').width;
const heightScreen = Dimensions.get('window').height;

const styles = StyleSheet.create({
  backgroundWrapper: {
    flex: 1,
    backgroundColor: Colors.White,
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  loginContent: {
    alignItems: 'center',
    paddingHorizontal: wp(8),
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: hp(4),
  },
  logoIcon: {
    width: 120,
    height: 120,
  },
  loginTitle: {
    fontSize: 32,
    fontFamily: 'Nunito-Bold',
    color: Colors.textBlack,
    marginBottom: hp(1),
  },
  loginSubtitle: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: Colors.darkGrey,
    marginBottom: hp(4),
    textAlign: 'center',
  },
  inputWrapper: {
    width: '100%',
    maxWidth: 400,
    marginBottom: hp(2),
  },
  pincodeInput: {
    height: 56,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.White,
    borderColor: Colors.mediumGrey,
    fontSize: 18,
    fontFamily: 'Nunito-Medium',
    color: Colors.textBlack,
    textAlign: 'center',
    letterSpacing: 4,
  },
  loginButton: {
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
  },
  loginButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 18,
    fontFamily: 'Nunito-ExtraBold',
    color: Colors.White,
  },
  bottomSpacer: {
    height: hp(10),
  },
  // Legacy styles kept for compatibility (can be removed if not used elsewhere)
  containerGroup: {
    alignItems: 'center',
  },
  topBar: {
    padding: 10,
    marginTop: hp(2),
  },
  qrContainer: {
    padding: 10,
  },
  qrTextContainer: {
    width: widthScreen / 1.3,
    alignSelf: 'center',
    marginBottom: 15,
  },
  logoText: {
    fontSize: 28,
    fontFamily: 'Nunito-Bold',
    marginLeft: hp(1.5),
    paddingBottom: 5,
  },
  qrIcon: {
    width: 138,
    height: 120,
  },
  qrText: {
    fontSize: 16,
    fontFamily: 'Nunito-Medium',
    paddingBottom: 5,
    textAlign: 'center',
    color: Colors.darkGrey,
  },
  qrText2: {
    fontSize: 16,
    fontFamily: 'Nunito-Medium',
    color: Colors.darkGrey,
  },
  bottomBar: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: widthScreen,
    alignItems: 'flex-end',
  },
  imageLeft: {
    width: 158,
    height: 158,
  },
  imageRight: {
    width: 124,
    height: 50,
    margin: 20,
  },
  InputContainer: {
    width: widthScreen / 1.3,
    alignSelf: 'center',
  },
  loginInput: {
    height: 40,
    margin: 7,
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    backgroundColor: Colors.White,
    borderColor: Colors.darkGrey,
    width: '100%',
    alignSelf: 'center',
    color: Colors.darkBlue,
  },
  keyboardVisible: {
    height: heightScreen / 2,
  },
  loginBtn: {
    height: 43,
    width: '100%',
    alignSelf: 'center',
    borderRadius: 10,
    margin: 5,
  },
  loginBtnInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginBtnText: {
    fontSize: 16,
    fontFamily: 'Nunito-ExtraBold',
    color: Colors.White,
  },
  qrSelectBtn: {
    height: 43,
    width: '50%',
    alignSelf: 'center',
    borderRadius: 5,
    margin: 5,
    backgroundColor: Colors.White,
    borderColor: Colors.darkGrey,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  cameraStyle: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
});

export default styles;
