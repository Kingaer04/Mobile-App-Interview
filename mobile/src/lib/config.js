import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Backend base URL resolution order:
 *  1. EXPO_PUBLIC_API_URL env var (e.g. EXPO_PUBLIC_API_URL=http://192.168.1.20:4000)
 *  2. `extra.apiUrl` in app.json
 *  3. In development: the same machine that serves the Metro bundle, port 4000
 *     (so a phone running Expo Go on the same Wi-Fi reaches your laptop automatically)
 */
function resolveApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const fromConfig = Constants.expoConfig?.extra?.apiUrl;
  if (fromConfig) return fromConfig.replace(/\/$/, '');

  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.20:8081"
  if (hostUri) return `http://${hostUri.split(':')[0]}:4000`;

  if (Platform.OS === 'android') return 'http://10.0.2.2:4000'; // Android emulator → host machine
  return 'http://localhost:4000';
}

export const API_URL = resolveApiUrl();
