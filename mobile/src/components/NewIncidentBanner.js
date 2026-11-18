import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLive } from '../context/LiveContext';
import { colors } from '../lib/theme';

/** In-app toast for incidents reported by other users while the app is open. */
export default function NewIncidentBanner() {
  const { lastIncident, dismiss } = useLive();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!lastIncident) return;
    const t = setTimeout(dismiss, 6000);
    return () => clearTimeout(t);
  }, [lastIncident]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lastIncident) return null;
  return (
    <Pressable
      style={[styles.banner, { top: insets.top + 8 }]}
      onPress={() => { dismiss(); router.push(`/incident/${lastIncident.id}`); }}
    >
      <Text style={styles.title}>{lastIncident.category.icon} New {lastIncident.category.name} reported</Text>
      <Text style={styles.body} numberOfLines={1}>{lastIncident.title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 100,
    backgroundColor: colors.text,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  title: { color: '#fff', fontWeight: '700', fontSize: 15 },
  body: { color: '#D1D5DB', marginTop: 2 },
});
