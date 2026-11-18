import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { io } from 'socket.io-client';
import { API_URL } from '../lib/config';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

/**
 * Real-time layer:
 *  - Socket.IO connection receives `incident:new` / `incident:deleted` events while the app is open
 *    → we refresh lists and show a local notification (works in Expo Go too).
 *  - Expo push token is registered with the backend so the server can notify
 *    the device while the app is closed (needs a development / production build).
 */

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const LiveContext = createContext({ version: 0, connected: false, lastIncident: null });

async function setupNotifications() {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    // A channel is optional – if the device/Expo Go rejects it, Android falls back to the default channel.
    try {
      await Notifications.setNotificationChannelAsync('incidents', {
        name: 'New incidents',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
      });
    } catch (e) {
      console.log('[notifications] channel setup skipped:', e.message);
    }
  }
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
    return status === 'granted';
  } catch (e) {
    console.log('[notifications] permission request failed:', e.message);
    return false;
  }
}

async function registerRemotePush() {
  // Remote push is not available in Expo Go on Android, nor on simulators.
  const inExpoGo = Constants.executionEnvironment === 'storeClient';
  if (!Device.isDevice || (inExpoGo && Platform.OS === 'android')) return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return; // run `eas init` to enable remote push
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.registerPushToken(data);
  } catch (e) {
    console.log('[push] registration skipped:', e.message);
  }
}

export function LiveProvider({ children }) {
  const { user, token } = useAuth();
  const [version, setVersion] = useState(0);
  const [connected, setConnected] = useState(false);
  const [lastIncident, setLastIncident] = useState(null);
  const userRef = useRef(user);
  const allowedRef = useRef(false);
  userRef.current = user;

  // Permissions + remote push token (re-register on login so the server knows who owns it).
  useEffect(() => {
    setupNotifications().then((ok) => {
      allowedRef.current = ok;
      if (ok) registerRemotePush();
    });
  }, [token]);

  // Tapping a notification opens the incident.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const id = resp.notification.request.content.data?.incidentId;
      if (id) router.push(`/incident/${id}`);
    });
    return () => sub.remove();
  }, []);

  // Live socket.
  useEffect(() => {
    const socket = io(API_URL, { transports: ['websocket'] });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('incident:deleted', () => setVersion((v) => v + 1));
    socket.on('incident:new', async (incident) => {
      setVersion((v) => v + 1);
      if (incident.user.id === userRef.current?.id) return; // don't notify the reporter
      setLastIncident(incident);
      if (allowedRef.current) {
        Notifications.scheduleNotificationAsync({
          content: {
            title: `${incident.category.icon} New ${incident.category.name} reported`,
            body: incident.address ? `${incident.title} — ${incident.address}` : incident.title,
            data: { incidentId: incident.id },
          },
          trigger: null,
        }).catch((e) => console.log('[notifications] could not show:', e.message));
      }
    });
    return () => socket.disconnect();
  }, []);

  return (
    <LiveContext.Provider value={{ version, connected, lastIncident, dismiss: () => setLastIncident(null) }}>
      {children}
    </LiveContext.Provider>
  );
}

export const useLive = () => useContext(LiveContext);
