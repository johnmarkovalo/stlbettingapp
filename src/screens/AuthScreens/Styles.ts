import {StyleSheet, Dimensions} from 'react-native';
import {palette} from '../../theme/colors';
import {fontFamily, fontSize} from '../../theme/typography';
import {borderRadius, spacing} from '../../theme/spacing';

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

const widthScreen = Dimensions.get('window').width;
const heightScreen = Dimensions.get('window').height;

const styles = StyleSheet.create({
  backgroundWrapper: {
    flex: 1,
    backgroundColor: palette.white,
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
    fontSize: fontSize['4xl'],
    fontFamily: fontFamily.bold,
    color: palette.gray[900],
    marginBottom: hp(1),
  },
  loginSubtitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    color: palette.gray[500],
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
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    backgroundColor: palette.white,
    borderColor: palette.gray[300],
    fontSize: fontSize.lg,
    fontFamily: fontFamily.medium,
    color: palette.gray[900],
    textAlign: 'center',
    letterSpacing: 4,
  },
  loginButton: {
    height: 56,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  loginButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.extraBold,
    color: palette.white,
  },
  bottomSpacer: {
    height: hp(10),
  },
  // Legacy styles kept for compatibility
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
    fontSize: fontSize['3xl'],
    fontFamily: fontFamily.bold,
    marginLeft: hp(1.5),
    paddingBottom: 5,
  },
  qrIcon: {
    width: 138,
    height: 120,
  },
  qrText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.medium,
    paddingBottom: 5,
    textAlign: 'center',
    color: palette.gray[500],
  },
  qrText2: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.medium,
    color: palette.gray[500],
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
    borderRadius: borderRadius.md,
    backgroundColor: palette.white,
    borderColor: palette.gray[500],
    width: '100%',
    alignSelf: 'center',
    color: palette.primary[900],
  },
  keyboardVisible: {
    height: heightScreen / 2,
  },
  loginBtn: {
    height: 43,
    width: '100%',
    alignSelf: 'center',
    borderRadius: borderRadius.md,
    margin: 5,
  },
  loginBtnInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginBtnText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.extraBold,
    color: palette.white,
  },
  qrSelectBtn: {
    height: 43,
    width: '50%',
    alignSelf: 'center',
    borderRadius: 5,
    margin: 5,
    backgroundColor: palette.white,
    borderColor: palette.gray[500],
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
