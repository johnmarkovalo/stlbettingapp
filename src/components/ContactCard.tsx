import React, { useContext } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Pressable,
} from "react-native";
import Images from "../Styles/Images";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import GradientText from "./GradientText";
import AvatarImage from "./AvatarImage";
import { useNavigation } from "@react-navigation/native";
import { PhoneContext } from "../contexts/phoneContext";

const widthScreen = Dimensions.get("window").width;
const ROW_HEIGHT = 60;

const ContactCard = (props) => {
  const { item, type } = props;
  const navigation = useNavigation();
  const phone = useContext(PhoneContext);

  if (type === "header") {
    return (
      <View style={{ height: 30 }}>
        <Text style={Styles.titleText}>{item}</Text>
      </View>
    );
  }

  const _OnContactPress = () => {
    navigation.navigate("ContactDetails", { contact: item });
  };

  const onCall = (number) => {
    const formalizedNumber = number.replace(/[^0-9]/g, "");
    phone.makeCall(formalizedNumber);
    if (phone.attendedTransferStarted) {
      navigation.navigate("InCall");
    } else {
      navigation.navigate("Dial");
    }
  };

  return (
    <Pressable style={[Styles.wrapper]} onPress={() => _OnContactPress()}>
      <View style={Styles.innerWrapper}>
        <View style={Styles.callLeftWrapper}>
          <AvatarImage
            avatar={item.hasThumbnail ? item.thumbnailPath : null}
            name={item?.displayName}
            width={35}
            height={35}
            icon={item?.favorite === 1 ? "star" : null}
          />
          <GradientText style={Styles.userText}>
            {item?.displayName}
          </GradientText>
        </View>
        <View style={Styles.callRightWrapper}>
          <TouchableOpacity
            onPress={() => {
              if (item?.phoneNumbers.length > 0) {
                onCall(item?.phoneNumbers[0].number);
              }
            }}
          >
            <Image source={Images.contactCall} style={Styles.optionIcon} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("ChatsTab")}>
            <Image source={Images.contactChat} style={Styles.optionIcon} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={Styles.lineList} />
    </Pressable>
  );
};

const Styles = StyleSheet.create({
  wrapper: {
    width: widthScreen,
    alignSelf: "center",
    // marginTop: hp(1.5),
    height: ROW_HEIGHT,
    // backgroundColor: "red",
    justifyContent: "center",
  },
  innerWrapper: {
    width: widthScreen / 1.12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userText: {
    fontFamily: "Nunito-Medium",
    fontSize: 18,
    marginLeft: hp(1.5),
  },
  lineList: {
    width: widthScreen / 1.05,
    alignSelf: "flex-end",
    marginTop: hp(1),
    height: hp(0.15),
    backgroundColor: "rgba(114, 114, 114, 0.08)",
  },
  callLeftWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  callRightWrapper: {
    width: hp(8),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionIcon: {
    width: 27,
    height: 27,
  },
  titleWrapper: {
    width: widthScreen / 1.12,
    alignSelf: "center",
    marginTop: hp(2),
  },
  titleText: {
    fontSize: 18,
    fontFamily: "Nunito-Bold",
    paddingLeft: hp(1.5),
    color: "#000",
  },
});
export default ContactCard;
