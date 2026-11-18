import { StyleSheet, Text, View } from 'react-native';
import { useLive } from '../context/LiveContext';

/** Small "● Live" pill for the header showing the real-time connection state. */
export default function LiveBadge() {
  const { connected } = useLive();
  return (
    <View style={styles.pill}>
      <View style={[styles.dot, { backgroundColor: connected ? '#4ADE80' : '#FCA5A5' }]} />
      <Text style={styles.text}>{connected ? 'Live' : 'Offline'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
