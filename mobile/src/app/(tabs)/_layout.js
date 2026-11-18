import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/theme';
import LiveBadge from '../../components/LiveBadge';
import useResponsive from '../../hooks/useResponsive';

const icon = (name) => ({ color, size, focused }) => (
  <Ionicons name={focused ? name : `${name}-outline`} size={size} color={color} />
);

export default function TabLayout() {
  const { isDesktop } = useResponsive();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
        sceneStyle: { backgroundColor: colors.bg },
        // Desktop/wide web: side navigation rail instead of a stretched bottom bar.
        tabBarPosition: isDesktop ? 'left' : 'bottom',
        tabBarVariant: isDesktop ? 'material' : 'uikit',
        tabBarLabelStyle: { fontWeight: '600' },
        tabBarStyle: isDesktop
          ? { width: 220, minWidth: 220, maxWidth: 220, paddingTop: 12, borderRightColor: colors.border }
          : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Incidents', tabBarLabel: 'Feed', tabBarIcon: icon('newspaper'), headerRight: () => <LiveBadge /> }}
      />
      <Tabs.Screen name="categories" options={{ title: 'Browse by Category', tabBarLabel: 'Categories', tabBarIcon: icon('grid') }} />
      <Tabs.Screen name="report" options={{ title: 'Report an Incident', tabBarLabel: 'Report', tabBarIcon: icon('add-circle') }} />
      <Tabs.Screen name="mine" options={{ title: 'My Reports', tabBarLabel: 'My Reports', tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
