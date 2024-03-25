import React, { useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  Keyboard,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import Styles from "./Styles";
import GradientText from "../../../components/GradientText";
import Colors from "../../../Styles/Colors.ts";
import colors from "../../../Styles/Colors.ts";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import KeyBoard from "../../../components/KeyBoard.tsx";

const widthScreen = Dimensions.get("window").width;
const TransacScreen = (props: any) => {
  const [opacity] = useState(new Animated.Value(1));
  const betType = props.route.params.betType;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true })
      ])
    ).start();
  }, [opacity]);

  return (
    <SafeAreaView style={Styles.backgroundWrapper}>
      <View style={Styles.mainContainer}>
        <View style={[Styles.headerContainer, {justifyContent: "center"}]}>
          <TouchableOpacity style={styles.backButton} onPress={() => props.navigation.goBack()}>
            <MaterialIcons
              name="arrow-back"
              size={40}
              color="black"
            />
          </TouchableOpacity>
          <GradientText color={colors.primaryColor} style={[Styles.logoText, {fontWeight: "bold"}]}>{betType.name}</GradientText>
          <GradientText style={Styles.logoText}></GradientText>
        </View>
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={{ width: widthScreen / 3 }}>
              <Text style={styles.cardSubTitle}>March 23, 2024</Text>
            </View>
            <View style={styles.verticalLine} />
            <View style={{ width: widthScreen / 3 }}>
              <Text style={styles.cardSubTitle}>3rd Draw</Text>
            </View>
            <View style={styles.verticalLine} />
            <View style={{ width: widthScreen / 3 }}>
              <Text style={styles.cardSubTitle}>ISABELA 01-001-2019</Text>
            </View>
          </View>
        </View>
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.inputContainerStyle}>
              <Animated.View style={{ opacity }}>
                <MaterialIcons
                  style={styles.backButton}
                  name="arrow-forward"
                  size={25}
                  color="black"
                />
              </Animated.View>
              <Text style={styles.inputTextStyle}>0</Text>
            </View>
            <View style={styles.inputContainerStyle}>
              <MaterialIcons
              style={styles.backButton}
              name="arrow-forward"
              size={25}
              color="black"
              />
              <Text style={styles.inputTextStyle}>0</Text>
            </View>
            <View style={styles.inputContainerStyle}>
              <MaterialIcons
              style={styles.backButton}
              name="arrow-forward"
              size={25}
              color="black"
              />
              <Text style={styles.inputTextStyle}>0</Text>
            </View>
          </View>
        </View>
        {/*<KeyBoard navigation={props.navigation} />*/}
        <View style={Styles.line} />
      </View>
    </SafeAreaView>
  );
};

const styles =  StyleSheet.create({
  headerContainer: {
    marginTop: 30,
  },

  backButton: {
    // Option 1: Reduce margin/padding for the button itself
    margin: 0,
    padding: 0,

    // Option 2: Alternatively, absolute positioning
    position: 'absolute',
    left: 0,
    zIndex: 1, // Ensure the button is on top
  },

  card: {
    height: 60,
    elevation: 2,
    justifyContent: "center",
    alignItems: "center",
  },

  cardContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },

  cardTitle: {
    fontSize: 20,
    color: Colors.darkGrey,
    fontWeight: "bold",
    alignSelf: "center",
    textTransform: "uppercase"
  },

  cardSubTitle: {
    fontSize: 14,
    color: colors.primaryColor,
    fontWeight: "bold",
    alignSelf: "center",
    textTransform: "uppercase",
  },


  verticalLine: {
    height: '80%', // Adjust height as needed
    width: 1,
    backgroundColor: 'gray',
  },

  container: {
    flex: 3,
    justifyContent: 'flex-start',
    alignItems: 'center'
  },

  inputContainerStyle: {
    flex: 3,
    borderRadius: 10,
    margin: 5,
    backgroundColor: "rgba(114, 114, 114, 0.08)",
    height: 60,
    borderWidth: 1,
    borderColor: Colors.primaryColor,
    justifyContent: "center",
  },

  inputTextStyle: {
    fontSize: 30,
    color: colors.primaryColor,
    fontWeight: "bold",
    alignSelf: "center",
    textTransform: "uppercase",
  },

  button: {
    elevation: 8,
    backgroundColor: Colors.primaryColor,
    borderRadius: 100,
    padding: 10,
    margin: 10,
    height: 60,
    width: widthScreen * 0.8,
    justifyContent: "center"
  },

  textStyle: {
    fontSize: 30,
    color: "#fff",
    fontWeight: "bold",
    alignSelf: "center",
    textTransform: "uppercase"
  },
});

export default TransacScreen;
