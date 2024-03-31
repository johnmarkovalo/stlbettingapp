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
  line: {
    width: widthScreen,
    alignSelf: 'center',
    marginTop: hp(2),
    height: hp(0.15),
    backgroundColor: 'rgba(114, 114, 114, 0.08)',
    // marginBottom: hp(2),
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
    borderRadius: 7,
    backgroundColor: Colors.grey,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,

    elevation: 1,
  },
});
export default styles;
