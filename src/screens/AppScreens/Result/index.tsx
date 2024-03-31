import React, {useEffect, useState} from 'react';
import {SafeAreaView, View, Text} from 'react-native';

import Styles from './Styles';

const Result = () => {
  return (
    <SafeAreaView style={Styles.backgroundWrapper}>
      <View style={Styles.mainContainer}>
        <View style={Styles.headerContainer}>
          <Text style={Styles.logoText}>{'Result'}</Text>
        </View>

        <View style={Styles.line} />
      </View>
    </SafeAreaView>
  );
};

export default Result;
