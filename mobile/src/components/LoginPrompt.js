import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { colors } from '../lib/theme';

export default function LoginPrompt({ message }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.inner}>
        <Ionicons name="person-circle-outline" size={72} color={colors.muted} />
        <Text style={styles.title}>You're not logged in</Text>
        <Text style={styles.msg}>{message}</Text>
        <Button title="Log in" onPress={() => router.push('/login')} style={{ alignSelf: 'stretch' }} />
        <Button title="Create an account" variant="outline" onPress={() => router.push('/register')} style={{ alignSelf: 'stretch' }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.bg },
  inner: { width: '100%', maxWidth: 400, alignItems: 'center', gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  msg: { fontSize: 15, color: colors.muted, textAlign: 'center', marginBottom: 8 },
});
