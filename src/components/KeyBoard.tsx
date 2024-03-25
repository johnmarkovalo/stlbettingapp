import React from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Images from '../Styles/Images';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import {useDispatch, useSelector} from 'react-redux';

import GradientText from './GradientText';
import Colors from '../Styles/Colors';
import {dialerActions} from '../store/actions';

const widthScreen = Dimensions.get('window').width;

const KeyBoard = props => {
  const {navigation, isDTMF, onDTMFKeyPress, handleDTMFKeypad} = props;
  const dispatch = useDispatch();
  // @ts-ignore
  const {destination} = useSelector(state => state.dialer);
  // @ts-ignore
  const auth = useSelector(state => state.auth);

  const onKeyPress = digit => {
    dispatch(dialerActions.addNumber(digit));
  };

  const _onInputButtonLongPressed = input => {
    if (input === '0' && !isDTMF) {
      onKeyPress('+');
    }
  };

  const submitValue = input => {
    if (isDTMF) {
      onDTMFKeyPress(input);
    } else {
      onKeyPress(input);
    }
  };

  const buttonStyle = () => {
    if (isDTMF) {
      return [
        Styles.keyButtonWrapper,
        {
          // backgroundColor: Colors.darkGrey,
          // borderRadius: 50,
          marginTop: hp(1),
        },
      ];
    } else {
      return Styles.keyButtonWrapper;
    }
  };

  return (
    <View style={Styles.container}>
      <View style={Styles.wrapper}>
        {/* 1 */}
        <View style={Styles.keyBoardWrapper}>
          <TouchableOpacity
            style={buttonStyle()}
            onPress={() => submitValue('1')}>
            <GradientText style={[Styles.textInput]}>{'1'}</GradientText>
            {!isDTMF && (
              <GradientText style={Styles.englishInput}>{''}</GradientText>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={buttonStyle()}
            onPress={() => submitValue('2')}>
            <GradientText style={Styles.textInput}>{'2'}</GradientText>
            {!isDTMF && (
              <GradientText style={Styles.englishInput}>{'abc'}</GradientText>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={buttonStyle()}
            onPress={() => submitValue('3')}>
            <GradientText style={Styles.textInput}>{'3'}</GradientText>
            {!isDTMF && (
              <GradientText style={Styles.englishInput}>{'def'}</GradientText>
            )}
          </TouchableOpacity>
        </View>

        {/* 2 */}
        <View style={Styles.keyBoardWrapper}>
          <TouchableOpacity
            style={buttonStyle()}
            onPress={() => submitValue('4')}>
            <GradientText style={Styles.textInput}>{'4'}</GradientText>
            {!isDTMF && (
              <GradientText style={Styles.englishInput}>{'ghi'}</GradientText>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={buttonStyle()}
            onPress={() => submitValue('5')}>
            <GradientText style={[Styles.textInput]}>{'5'}</GradientText>
            {!isDTMF && (
              <GradientText style={Styles.englishInput}>{'jkl'}</GradientText>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={buttonStyle()}
            onPress={() => submitValue('6')}>
            <GradientText style={Styles.textInput}>{'6'}</GradientText>
            {!isDTMF && (
              <GradientText style={Styles.englishInput}>{'mno'}</GradientText>
            )}
          </TouchableOpacity>
        </View>

        {/* 3 */}
        <View style={Styles.keyBoardWrapper}>
          <TouchableOpacity
            style={buttonStyle()}
            onPress={() => submitValue('7')}>
            <GradientText style={Styles.textInput}>{'7'}</GradientText>
            {!isDTMF && (
              <GradientText style={Styles.englishInput}>{'pqrs'}</GradientText>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={buttonStyle()}
            onPress={() => submitValue('8')}>
            <GradientText style={Styles.textInput}>{'8'}</GradientText>
            {!isDTMF && (
              <GradientText style={Styles.englishInput}>{'tuv'}</GradientText>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={buttonStyle()}
            onPress={() => submitValue('9')}>
            <GradientText style={Styles.textInput}>{'9'}</GradientText>
            {!isDTMF && (
              <GradientText style={Styles.englishInput}>{'wxyz'}</GradientText>
            )}
          </TouchableOpacity>
        </View>

        {/* 4 */}
        <View style={Styles.keyBoardWrapper}>
          <TouchableOpacity
            style={buttonStyle()}
            onPress={() => submitValue('*')}>
            <GradientText style={Styles.textInputBlur}>{'*'}</GradientText>
          </TouchableOpacity>
          <TouchableOpacity
            style={buttonStyle()}
            onPress={() => submitValue('0')}
            onLongPress={() => _onInputButtonLongPressed('0')}>
            <GradientText style={Styles.textInput}>{'0'}</GradientText>
          </TouchableOpacity>
          <TouchableOpacity
            style={buttonStyle()}
            onPress={() => submitValue('#')}>
            <GradientText style={Styles.textInputBlur}>{'#'}</GradientText>
          </TouchableOpacity>
        </View>

        {/* 5 */}
        <View style={[Styles.keyBoardWrapper, {marginTop: hp(2)}]}>
          {!isDTMF && auth?.user?.sip_username ? (
            <VoiceMailBtn sipUsername={auth?.user?.sip_username} />
          ) : (
            <View style={Styles.keyButtonWrapper} />
          )}

          {!isDTMF ? (
            <TouchableOpacity
              onPress={() => {
                makeCall(destination);
                if (attendedTransferStarted) {
                  navigation.navigate('InCall');
                }
              }}
              style={Styles.keyButtonWrapper}>
              <Image source={Images.callButton} style={Styles.buttonCall} />
            </TouchableOpacity>
          ) : (
            <View style={Styles.keyButtonWrapper} />
          )}

          {!isDTMF ? (
            <TouchableOpacity
              onLongPress={() => dispatch(dialerActions.clear())}
              onPress={() => dispatch(dialerActions.removeNumber())}
              style={Styles.keyButtonWrapper}>
              <Image
                source={Images.backSpace}
                style={{width: 23.82, height: 17.47}}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleDTMFKeypad}
              style={[Styles.keyButtonWrapper]}>
              <Image
                source={Images.keypadIcon}
                style={{width: 56, height: 56}}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const Styles = StyleSheet.create({
  container: {
    width: widthScreen,
    alignSelf: 'center',
  },
  wrapper: {
    width: widthScreen / 1.2,
    alignSelf: 'center',
    marginTop: hp(1.5),
    paddingBottom: hp(2.5),
  },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 60,
  },
  userText: {
    fontFamily: 'Nunito-Medium',
    fontSize: 14,
    marginTop: hp(0.7),
    textAlign: 'center',
    width: hp(8),
    // alignSelf: "center",
  },
  keyButtonWrapper: {
    width: hp(10.5),
    marginTop: hp(2),
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyBoardWrapper: {
    width: '99%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp(1.5),
    height: hp(6.5),
  },
  englishInput: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    textAlign: 'center',
  },
  buttonCall: {
    width: 56,
    height: 56,
    borderRadius: 56,
  },
  textInput: {
    fontSize: 30,
    fontFamily: 'Nunito-ExtraBold',
    color: Colors.White,
  },
  textLetterInput: {
    fontSize: 14,
    fontFamily: 'Nunito',
    marginBottom: 10,
  },
  textInputBlur: {
    fontSize: 30,
    fontFamily: 'Nunito-ExtraBold',
    opacity: 0.3,
  },
});
export default KeyBoard;
