import {StyleSheet, Dimensions} from 'react-native';
import Colors from '../../../Styles/Colors';

import {heightPercentageToDP as hp} from 'react-native-responsive-screen';

const widthScreen = Dimensions.get('window').width;

const styles = StyleSheet.create({
  backgroundWrapper: {
    flex: 1,
    backgroundColor: Colors.White,
  },
  mainContainer: {
    flex: 1,
  },
  headerContainer: {
    width: widthScreen / 1.12,
    alignSelf: 'center',
    marginVertical: hp(3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoText: {
    color: Colors.Black,
    fontSize: 26,
    fontFamily: 'Nunito-Bold',
  },
  addIcon: {
    width: 16,
    height: 17.28,
  },
  line: {
    width: widthScreen,
    alignSelf: 'center',
    marginTop: hp(2),
    height: hp(0.15),
    backgroundColor: 'rgba(114, 114, 114, 0.08)',
    // marginBottom: hp(2),
  },
});
export default styles;
