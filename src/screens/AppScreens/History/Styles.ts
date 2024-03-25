import { StyleSheet, Dimensions } from "react-native";
import Colors from "../../../Styles/Colors";

import { heightPercentageToDP as hp } from "react-native-responsive-screen";

const widthScreen = Dimensions.get("window").width;

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
    alignSelf: "center",
    marginTop: hp(3),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rightWrapper: {
    width: hp(10),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoText: {
    fontSize: 26,
    fontFamily: "Nunito-Bold",
  },
  deleteText: {
    fontSize: 14,
    fontFamily: "Nunito-Bold",
    color: Colors.mediumRed,
  },
  doneText: {
    fontSize: 14,
    fontFamily: "Nunito-Bold",
  },
  addIcon: {
    width: 16,
    height: 17.28,
  },
  line: {
    width: widthScreen,
    alignSelf: "center",
    marginTop: hp(2),
    height: hp(0.15),
    backgroundColor: "rgba(114, 114, 114, 0.08)",
    // marginBottom: hp(2),
  },
  scrollContent: {
    marginBottom: hp(6),
    width: widthScreen / 1.12,
    alignSelf: "center",
  },
  listWrapper: {
    width: widthScreen / 1.12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    marginTop: hp(1),
    justifyContent: "space-between",
  },
  container: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 7,
    backgroundColor: Colors.grey,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,

    elevation: 1,
  },
  inActiveContainer: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 7,
  },
  activeTab: {
    fontFamily: "Nunito-SemiBold",
    fontSize: hp(1.5),
    color: Colors.White,
    // margin: hp(1.5)
    marginLeft: hp(1.5),
    marginRight: hp(1.5),
    marginVertical: hp(1),
  },
  inActiveTab: {
    fontFamily: "Nunito-Medium",
    fontSize: hp(1.5),
    color: Colors.darkBlue,
    marginLeft: hp(1.5),
    marginRight: hp(1.5),
    marginVertical: hp(1),
    // marginLeft: wp(3),
  },
  titleWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: hp(2),
  },
  titleText: {
    fontSize: 18,
    fontFamily: "Nunito-Bold",
  },
  numberText: {
    color: "#C0C0C0",
    fontSize: 12,
    fontFamily: "Nunito-SemiBold",
    marginLeft: 8,
    marginBottom: 3,
  },
});
export default styles;
