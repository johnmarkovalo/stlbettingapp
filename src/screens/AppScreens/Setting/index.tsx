import React, { useEffect, useState } from "react";
import { SafeAreaView, View } from "react-native";

import Styles from "./Styles";
import GradientText from "../../../components/GradientText";

const Setting = () => {

  return (
    <SafeAreaView style={Styles.backgroundWrapper}>
      <View style={Styles.mainContainer}>
        <View style={Styles.headerContainer}>
          <GradientText style={Styles.logoText}>{"Setting"}</GradientText>
        </View>

        <View style={Styles.line} />
      </View>
    </SafeAreaView>
  );
};

export default Setting;
