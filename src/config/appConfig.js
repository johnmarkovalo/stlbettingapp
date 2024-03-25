import AsyncStorage from "@react-native-async-storage/async-storage";
import DeviceInfo from "react-native-device-info";

export const appConfig = {
  apiUrl: "https://portal-dev.vocphone.com",
  apiPathPrefix: "/api/mobile/user",
  environment: () => {
    if (__DEV__) return "development";

    return "production";
  },
  notificationSmallIcon: "ic_launcher",
  isPushConfigured: true,
  getApiUrl: async () => {
    const url = await AsyncStorage.getItem("API_URL") || appConfig.apiUrl;
    return `${url}`
  },
};

export const APP_VERSION = `VERSION: ${DeviceInfo.getVersion()}_${DeviceInfo.getBuildNumber()}`
