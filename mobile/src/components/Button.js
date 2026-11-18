import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../lib/theme';

export default function Button({ title, onPress, loading, disabled, variant = 'solid', style, icon }) {
  const outline = variant === 'outline';
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        outline ? styles.outline : styles.solid,
        pressed && { opacity: 0.8 },
        isDisabled && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={outline ? colors.primary : '#fff'} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, outline && { color: colors.primary }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', gap: 8, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  solid: { backgroundColor: colors.primary },
  outline: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: 'transparent' },
  text: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
