import {StyleSheet, Dimensions} from 'react-native';
import {palette} from '../../../theme/colors';
import {fontFamily, fontSize} from '../../../theme/typography';
import {spacing, borderRadius} from '../../../theme/spacing';
import {heightPercentageToDP as hp} from 'react-native-responsive-screen';

const widthScreen = Dimensions.get('window').width;

const styles = StyleSheet.create({
  backgroundWrapper: {
    flex: 1,
    backgroundColor: palette.gray[50],
  },
  mainContainer: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.white,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray[200],
  },
  logoText: {
    color: palette.gray[900],
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
  },
  line: {
    width: widthScreen,
    alignSelf: 'center',
    marginTop: hp(2),
    height: 1,
    backgroundColor: palette.gray[200],
  },
  scrollContent: {
    marginBottom: hp(6),
    width: widthScreen / 1.12,
    alignSelf: 'center',
  },
  listWrapper: {
    width: widthScreen / 1.12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(1),
    justifyContent: 'space-between',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    backgroundColor: palette.gray[50],
  },
  cameraStyle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignSelf: 'center',
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
});
export default styles;
