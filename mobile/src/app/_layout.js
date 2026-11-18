import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { AuthProvider } from '../context/AuthContext';
import { LiveProvider } from '../context/LiveContext';
import NewIncidentBanner from '../components/NewIncidentBanner';
import { colors } from '../lib/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <LiveProvider>
        <View style={{ flex: 1 }}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.primary },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: '700' },
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="incident/[id]" options={{ title: 'Incident' }} />
            <Stack.Screen name="category/[slug]" options={{ title: 'Category' }} />
            <Stack.Screen name="login" options={{ title: 'Log in', presentation: 'modal' }} />
            <Stack.Screen name="register" options={{ title: 'Create account', presentation: 'modal' }} />
          </Stack>
          <NewIncidentBanner />
        </View>
      </LiveProvider>
    </AuthProvider>
  );
}
