import { useCallback } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import IncidentList from '../../components/IncidentList';
import LoginPrompt from '../../components/LoginPrompt';
import Avatar from '../../components/Avatar';
import { api } from '../../lib/api';
import { colors } from '../../lib/theme';

function confirm(title, msg) {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${msg}`));
  return new Promise((resolve) =>
    Alert.alert(title, msg, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
    ]));
}

export default function MyReportsScreen() {
  const { user, logout } = useAuth();
  const fetchPage = useCallback((page, limit) => api.myIncidents({ page, limit }), []);

  if (!user) return <LoginPrompt message="Log in to see the incidents you have reported." />;

  const onLongPress = async (incident, refresh) => {
    if (await confirm('Delete report?', `"${incident.title}" will be removed for everyone.`)) {
      try { await api.deleteIncident(incident.id); refresh(); } catch (e) { Alert.alert('Error', e.message); }
    }
  };

  return (
    <IncidentList
      fetchPage={fetchPage}
      deps={[user.id]}
      onLongPressItem={onLongPress}
      title="Your reports"
      emptyText="You haven't reported any incidents yet. Use the Report tab to submit one."
      header={
        <View style={styles.profile}>
          <Avatar name={user.name} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
          <Pressable onPress={logout} style={styles.logout} hitSlop={8}>
            <Ionicons name="log-out-outline" size={18} color={colors.primary} />
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card,
    padding: 16, marginTop: 16, borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  email: { fontSize: 13, color: colors.muted },
  logout: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logoutText: { color: colors.primary, fontWeight: '600' },
});
