import React, { useContext } from "react";
import { StyleSheet, Pressable, View } from "react-native";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import GradientText from "./GradientText";
import AvatarImage from "./AvatarImage";
import { PhoneContext } from "../contexts/phoneContext";
import { useNavigation } from "@react-navigation/native";

const UserCard = (props: any) => {
  const { item, keyID } = props;
  const phone = useContext(PhoneContext);
  const navigation = useNavigation();

  const onCall = (number) => {
    phone.makeCall(number);
    if (phone.attendedTransferStarted) {
      // @ts-ignore
      navigation.navigate("InCall");
    } else {
      // @ts-ignore
      navigation.navigate("Dial");
    }
  };

  return (
    <Pressable
      onPress={() => onCall(item.extension)}
      key={keyID}
      style={[Styles.wrapper]}
    >
      <View style={{ height: 35 }}>
        <AvatarImage
          avatar={item?.pic}
          name={item?.name}
          width={35}
          height={35}
        />
      </View>
      <View style={{ height: 65 }}>
        <GradientText style={Styles.userText}>{item?.name}</GradientText>
      </View>
    </Pressable>
  );
};

const Styles = StyleSheet.create({
  wrapper: {
    width: hp(11),
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginTop: hp(1.5),
    marginBottom: hp(1.5),
    height: 100,
  },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 60,
  },
  iconLetter: {
    width: 35,
    height: 35,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 50,
    backgroundColor: "#F2F2F2",
  },
  userText: {
    fontFamily: "Nunito-Medium",
    fontSize: 14,
    marginTop: hp(0.7),
    textAlign: "center",
    width: hp(8),
    // alignSelf: "center",
  },
});
export default UserCard;
