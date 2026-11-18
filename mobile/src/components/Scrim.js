import { Platform, StyleSheet, View } from 'react-native';

/**
 * Bottom-up dark fade over photos so white text stays readable.
 * Web uses a CSS gradient; native stacks translucent bands (no extra native dependency).
 */
const BANDS = 10;

export default function Scrim({ height = 90, strength = 0.7 }) {
  if (Platform.OS === 'web') {
    return (
      <View
        pointerEvents="none"
        style={[styles.base, { height, backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,${strength}))` }]}
      />
    );
  }
  return (
    <View pointerEvents="none" style={[styles.base, { height }]}>
      {Array.from({ length: BANDS }, (_, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: `rgba(0,0,0,${((i + 1) / BANDS) ** 1.6 * strength})` }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ base: { position: 'absolute', left: 0, right: 0, bottom: 0 } });
