import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';

/**
 * Page numbers to show: all of them when there are few, otherwise
 * first, last, and the current page's neighbours with "…" gaps — e.g. 1 … 4 5 6 … 12.
 */
export function pageItems(current, totalPages) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (current >= totalPages - 2) [totalPages - 1, totalPages - 2, totalPages - 3].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}

function NavButton({ label, icon, iconRight, disabled, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.nav, disabled && styles.disabled, pressed && styles.pressed]}
      hitSlop={6}
    >
      {!iconRight && <Ionicons name={icon} size={16} color={disabled ? colors.muted : colors.text} />}
      <Text style={[styles.navText, disabled && { color: colors.muted }]}>{label}</Text>
      {iconRight && <Ionicons name={icon} size={16} color={disabled ? colors.muted : colors.text} />}
    </Pressable>
  );
}

export default function Pagination({ page, totalPages, onChange, disabled }) {
  if (totalPages <= 1) return null;
  return (
    <View style={styles.wrap}>
      <NavButton label="Prev" icon="chevron-back" disabled={disabled || page <= 1} onPress={() => onChange(page - 1)} />

      <View style={styles.numbers}>
        {pageItems(page, totalPages).map((p) =>
          typeof p === 'string' ? (
            <Text key={p} style={styles.gap}>…</Text>
          ) : (
            <Pressable
              key={p}
              onPress={() => p !== page && onChange(p)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={`Page ${p}`}
              accessibilityState={{ selected: p === page }}
              style={({ pressed }) => [styles.num, p === page && styles.numActive, pressed && styles.pressed]}
            >
              <Text style={[styles.numText, p === page && styles.numTextActive]}>{p}</Text>
            </Pressable>
          ),
        )}
      </View>

      <NavButton label="Next" icon="chevron-forward" iconRight disabled={disabled || page >= totalPages} onPress={() => onChange(page + 1)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 8 },
  numbers: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  nav: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 12, height: 38, borderRadius: 10,
    backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: '#D5D9E0',
    ...(Platform.OS === 'web' && { cursor: 'pointer' }),
  },
  navText: { fontSize: 14, fontWeight: '700', color: colors.text },
  num: {
    minWidth: 36, height: 38, paddingHorizontal: 6, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: '#D5D9E0',
    ...(Platform.OS === 'web' && { cursor: 'pointer' }),
  },
  numActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  numText: { fontSize: 14, fontWeight: '700', color: colors.text },
  numTextActive: { color: '#fff' },
  gap: { color: colors.muted, fontWeight: '700', paddingHorizontal: 2 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
});
