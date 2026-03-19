import React, {useEffect, useRef, useState} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';

import Styles from './Styles';
import {palette} from '../../../theme/colors';
import {fontFamily, fontSize} from '../../../theme/typography';
import {spacing, borderRadius} from '../../../theme/spacing';
import {shadows} from '../../../theme/shadows';
import Icon from '../../../components/shared/Icon';
import ListItem from '../../../components/shared/ListItem';
import Divider from '../../../components/shared/Divider';
import Card from '../../../components/shared/Card';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import {useDispatch, useSelector} from 'react-redux';
import {
  userActions,
  typesActions,
  localSoldOutsActions,
} from '../../../store/actions';
import {syncBetTypesAPI, getSoldOutsAPI} from '../../../helper/api';
import {insertTypes} from '../../../database';
import {
  formatBetTypes,
  checkInternetConnection,
} from '../../../helper/functions';
import {APP_VERSION, appConfig} from '../../../config/appConfig';
import {manualUpdateCheck} from '../../../services/updateService';

// Define types for Redux state
interface RootState {
  auth: {
    user: any;
    token: string;
  };
}

const Setting = (props: any) => {
  const internetStatusCheck = useRef(checkInternetConnection());
  const {navigation} = props;
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const dispatch = useDispatch();
  const [agent, setAgent] = useState<any>({});

  useEffect(() => {
    setAgent({...user});
  }, []);

  const logout = () => {
    Alert.alert('Confirmation', 'Are you sure you want to log out?', [
      {
        text: 'Yes',
        onPress: () => {
          // @ts-ignore
          dispatch(userActions.logout());
        },
      },
      {
        text: 'No',
      },
    ]);
  };

  const syncBetTypes = async () => {
    if (!internetStatusCheck.current.isConnected()) {
      Alert.alert('Error', 'No internet connection');
      return;
    }
    if (internetStatusCheck.current.isSlow()) {
      Alert.alert('Error', 'Slow internet connection');
      return;
    }

    try {
      const types = await syncBetTypesAPI(token);
      if (types && types.length > 0) {
        insertTypes(types);
        dispatch(typesActions.update(formatBetTypes(types)));

        const soldouts = await getSoldOutsAPI(token);
        if (soldouts) {
          dispatch(localSoldOutsActions.updateServerSoldouts(soldouts));
        }

        Alert.alert('Success', 'Settings are synced');
      } else {
        Alert.alert(
          'Sync Failed',
          'No settings data received from server. Please try again.',
        );
      }
    } catch (error: any) {
      console.error('Sync settings error:', error);
      const errorMessage =
        error?.response?.status === 401
          ? 'Session expired. Please log in again.'
          : 'Failed to sync settings. Please check your connection and try again.';
      Alert.alert('Sync Failed', errorMessage);
    }
  };

  return (
    <SafeAreaView style={Styles.backgroundWrapper}>
      <View style={Styles.mainContainer}>
        <View style={Styles.headerContainer}>
          <Text style={Styles.logoText}>{'Settings'}</Text>
        </View>

        <ScrollView style={styles.scrollContent}>
          {/* Profile Card */}
          <Card style={styles.profileCard}>
            <View style={styles.profileRow}>
              <View style={styles.profileAvatar}>
                <Icon name="UserCircle" size={44} color={palette.primary[500]} weight="fill" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{agent.agent_name}</Text>
                <Text style={styles.profileSeries}>{agent.agent_series}</Text>
              </View>
            </View>
          </Card>

          {/* Settings List */}
          <Card style={styles.settingsCard}>
            <ListItem
              title="Sync Settings"
              subtitle="Sync bet types and sold-outs"
              icon="CloudArrowDown"
              iconColor={palette.primary[500]}
              onPress={syncBetTypes}
            />
            <Divider style={styles.listDivider} />
            <ListItem
              title="Printer Setup"
              subtitle="Configure thermal printer"
              icon="Printer"
              iconColor={palette.accent[600]}
              onPress={() => navigation.navigate('PrinterSetup')}
            />
            <Divider style={styles.listDivider} />
            <ListItem
              title="Check for Updates"
              subtitle="Download latest version"
              icon="ArrowSquareUp"
              iconColor={palette.success[500]}
              onPress={manualUpdateCheck}
            />
            <Divider style={styles.listDivider} />
            <ListItem
              title="Reset Sync Status"
              subtitle="Reset transactions for re-sync"
              icon="ArrowsClockwise"
              iconColor={palette.warning[500]}
              onPress={() => navigation.navigate('ResetStatus')}
            />
          </Card>
        </ScrollView>

        {/* Footer */}
        <TouchableOpacity
          style={styles.footer}
          onLongPress={logout}>
          <Text style={styles.versionText}>v{APP_VERSION}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  profileCard: {
    marginBottom: spacing[4],
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    marginRight: spacing[3],
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: palette.gray[900],
  },
  profileSeries: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: palette.gray[500],
    marginTop: 2,
  },
  settingsCard: {
    paddingHorizontal: 0,
    paddingVertical: spacing[1],
  },
  listDivider: {
    marginVertical: 0,
    marginHorizontal: spacing[4],
  },
  footer: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  versionText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: palette.gray[400],
  },
});

export default Setting;
