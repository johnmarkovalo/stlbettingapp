import { Platform, Alert } from "react-native";
import notifee, {
  AuthorizationStatus,
  EventType,
  AndroidColor,
  AndroidImportance,
  AndroidCategory,
  AndroidVisibility,
  IOSAuthorizationStatus,
  AndroidGroupAlertBehavior,
} from "@notifee/react-native";
import { appConfig } from "../config/appConfig";
import Contacts from "react-native-contacts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NotificationSounds from "react-native-notification-sounds";
import { getSelected } from "./functions";

const initializedGroups = new Set();

async function sendGroupSummary(groupId, title, priority) {
  if (Platform.OS === "android") {
    await notifee.displayNotification({
      title: title,
      data: {
        type: "sms_push",
        threadId: groupId,
      },
      android: {
        channelId:
          priority === "high"
            ? "sms_notification"
            : "general_notification_vocphone",
        smallIcon: appConfig.notificationSmallIcon, // optional, defaults to 'ic_launcher'.
        // color: '#DE2886',
        groupSummary: true,
        groupId: groupId,
        groupAlertBehavior: AndroidGroupAlertBehavior.SUMMARY,
        pressAction: {
          id: "default",
        },
      },
    });
  } else {
    await notifee.setNotificationCategories([
      {
        id: groupId,
        summaryFormat: "You have messages from %@.",
      },
    ]);
  }
}

export const presentMissedCallNotification = async (displayName, callId) => {
  const body = {
    title: "Missed Call",
    body: displayName,
    data: {
      queue_calls: "0",
      id: "missedCall",
    },
    android: {
      channelId: "missed_call_notification_default",
      smallIcon: appConfig.notificationSmallIcon, // optional, defaults to 'ic_launcher'.
      // color: '#DE2886',
      groupId: "vocphone_call_missed",
      timestamp: Date.now(),
      showTimestamp: true,
      pressAction: {
        id: "default",
      },
    },
    ios: {
      foregroundPresentationOptions: {
        alert: true,
        badge: true,
        sound: true,
      },
    },
  };

  let isQueue = callId?.includes("recipient");
  if (isQueue) {
    const nots = await notifee.getDisplayedNotifications();
    console.log(nots);
    const queueCallNots = nots.length
      ? nots.filter((el) =>
          el.notification?.title?.includes("Missed Queue Call")
        )
      : [];
    if (queueCallNots.length) {
      body.id = queueCallNots[0]?.id;
      body.data.queue_calls = `${
        parseInt(queueCallNots[0].notification.data.queue_calls) + 1
      }`;
      body.title = `Missed Queue Calls (${body.data.queue_calls})`;
      await notifee.displayNotification(body);
    } else {
      body.data.queue_calls = "1";
      body.title = "Missed Queue Call";
      await notifee.displayNotification(body);
    }
  } else {
    await notifee.displayNotification(body);
  }
};

export const presentSMSNotification = async (title, body) => {
  const dnd = await AsyncStorage.getItem("dnd");
  if (dnd === "@dnd") {
    return;
  }

  const payload = {
    title,
    body,
    data: {
      id: "push_sms",
    },
    android: {
      channelId: "sms_notification_default",
      smallIcon: appConfig.notificationSmallIcon, // optional, defaults to 'ic_launcher'.
      timestamp: Date.now(),
      showTimestamp: true,
      // color: '#DE2886',
      pressAction: {
        id: "default",
      },
    },
    ios: {
      foregroundPresentationOptions: {
        alert: true,
        badge: true,
        sound: true,
      },
    },
  };

  console.info(`SMS TITLE ${title}`);

  await notifee.displayNotification(payload);
};

// export const presentSMSNotification = async (
//   notificationId,
//   title,
//   body,
//   threadId,
//   priority = "low"
// ) => {
//   const sms_dnd = await AsyncStorage.getItem("@sms_dnd");
//   if (sms_dnd === "dnd") {
//     return;
//   }

//   // get the contact information
//   const granted = await Contacts.checkPermission();
//   const contact =
//     granted === "authorized"
//       ? await Contacts.getContactsByPhoneNumber(title)
//       : [];
//   if (contact.length > 0) {
//     title =
//       Platform.OS === "android" ? contact[0].displayName : contact[0].givenName;
//   }

//   // If the group is not initialized, send the summary notification
//   if (!initializedGroups.has(threadId)) {
//     // For the sake of this example, I'm using generic titles and subtitles. Adjust as needed.
//     await sendGroupSummary(threadId, title, priority);
//     initializedGroups.add(threadId);
//   }

//   const payload = {
//     id: notificationId,
//     title,
//     body,
//     data: {
//       type: "sms_push",
//       threadId,
//     },
//     android: {
//       channelId:
//         priority === "high"
//           ? "sms_notification"
//           : "general_notification_vocphone",
//       smallIcon: appConfig.notificationSmallIcon, // optional, defaults to 'ic_launcher'.
//       // color: '#DE2886',
//       pressAction: {
//         id: "default",
//       },
//       sound: "default",
//       groupId: threadId,
//       groupAlertBehavior: AndroidGroupAlertBehavior.CHILDREN,
//     },
//     ios: {
//       foregroundPresentationOptions: {
//         alert: false,
//         banner: false,
//         badge: true,
//         sound: true,
//       },
//       sound: "default",
//       threadId,
//       categoryId: threadId,
//       summaryArgument: title,
//     },
//   };

//   await notifee.displayNotification(payload);
// };

export const presentLocalGeneralNotification = async (
  message,
  notificationId
) => {
  const body = {
    id: notificationId,
    title: "Vocphone",
    body: message,
    android: {
      channelId: "general_notification_vocphone",
      smallIcon: appConfig.notificationSmallIcon, // optional, defaults to 'ic_launcher'.
      // color: '#DE2886',
    },
    ios: {
      foregroundPresentationOptions: {
        alert: true,
        badge: true,
        sound: true,
      },
    },
  };

  await notifee.displayNotification(body);
};

export const clearBadgeCount = async () => {
  await notifee.setBadgeCount(0);
  await notifee.cancelAllNotifications();
};

export const getBadgeCountIOS = async () => {
  return await notifee.getBadgeCount();
};

export const checkChannelPermission = async () => {
  // Create a channel
  await notifee.createChannel({
    id: "missed_call_notification_default",
    name: "Missed Call Notification",
    vibration: false,
  });

  await notifee.createChannel({
    id: "general_notification_vocphone",
    name: "Vocphone General Notification",
    vibration: true,
    sound: "default",
  });

  await notifee.createChannel({
    id: "sms_notification_default",
    name: "Sms Notification",
    vibration: true,
    sound: "default",
  });

  const selectedRingTone = await getSelected();

  let _channelId = "";
  if (selectedRingTone) {
    _channelId = `incoming_call_vocphone_id_${selectedRingTone.soundID}`;
  } else {
    _channelId = "incoming_call_vocphone_id_default";
  }

  const channel = await notifee.getChannel(_channelId);

  const ringToneList = await NotificationSounds.getNotifications("ringtone");

  if (!channel) {
    await notifee.createChannel({
      id: _channelId,
      name: `Incoming Call Vocphone ${selectedRingTone?.soundID || "default"}`,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      category: AndroidCategory.CALL,
      vibration: true,
      vibrationPattern: [1500, 1000],
      sound: selectedRingTone ? selectedRingTone.url : ringToneList[0]?.url,
    });
  }

  console.log("CALL NOTIFICATION SETTINGS => " + JSON.stringify(_channelId));

  if (channel?.blocked) {
    console.log(_channelId + "=> Channel is disabled");

    Alert.alert(
      "IMPORTANT",
      "Your Call Notification is disabled, Please enable it on your app settings. You must enable this to get calls when your app is not in foreground",
      [
        {
          text: "OK",
          onPress: async () =>
            await notifee.openNotificationSettings(channelId),
        },
      ]
    );
  } else {
    console.log(_channelId + "=> Channel is enabled");
  }

  return _channelId;
};
