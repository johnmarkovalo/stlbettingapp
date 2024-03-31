import React, {useEffect, useState} from 'react';
import {SafeAreaView, View, Text} from 'react-native';

import Styles from './Styles';

const Setting = () => {
  return (
    <SafeAreaView style={Styles.backgroundWrapper}>
      <View style={Styles.mainContainer}>
        <View style={Styles.headerContainer}>
          <Text style={Styles.logoText}>{'Setting'}</Text>
        </View>

        <View style={Styles.line} />
      </View>
    </SafeAreaView>
  );
};

export default Setting;
