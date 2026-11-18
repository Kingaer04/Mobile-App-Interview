import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { cardSurface } from './IncidentCard';
import { colors } from '../lib/theme';

const NATIVE = Platform.OS !== 'web';

/** Pulsing placeholder shown while a page of incidents is loading. */
export default function SkeletonCard({ mediaHeight = 190 }) {
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: NATIVE }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: NATIVE }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View style={[cardSurface, { opacity: pulse }]}>
      <View style={[styles.block, { height: mediaHeight, borderRadius: 0 }]} />
      <View style={styles.body}>
        <View style={[styles.block, { height: 18, width: '75%' }]} />
        <View style={[styles.block, { height: 12, width: '95%' }]} />
        <View style={[styles.block, { height: 12, width: '60%' }]} />
        <View style={styles.footer}>
          <View style={[styles.block, { width: 26, height: 26, borderRadius: 13 }]} />
          <View style={[styles.block, { height: 12, width: 90 }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: '#E5E7EB', borderRadius: 6 },
  body: { padding: 16, gap: 10 },
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
});
