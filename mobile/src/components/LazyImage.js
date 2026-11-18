import { useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Image that only fetches when its card is rendered (the list virtualises off-screen cards),
 * shows a tinted placeholder meanwhile, and fades in once loaded.
 */
export default function LazyImage({ uri, style, tint = '#CBD5E1' }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [failed, setFailed] = useState(false);

  return (
    <View style={[style, { backgroundColor: `${tint}22`, overflow: 'hidden' }]}>
      {failed ? (
        <View style={styles.center}>
          <Ionicons name="image-outline" size={28} color={tint} />
        </View>
      ) : (
        <Animated.Image
          source={{ uri }}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { opacity }]}
          onLoad={() => Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: Platform.OS !== 'web' }).start()}
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
