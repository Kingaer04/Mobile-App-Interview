import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { categoryColor, colors } from '../lib/theme';

/** Single-select category chips. Horizontal scroll row by default; `wrap` renders bare chips for a wrapping container. */
export default function CategoryChips({ categories, value, onChange, allLabel, wrap }) {
  const items = allLabel ? [{ slug: null, name: allLabel, icon: '' }, ...categories] : categories;
  const chips = items.map((c) => {
    const active = value === c.slug;
    const tint = c.slug ? categoryColor(c.slug) : colors.text;
    return (
      <Pressable
        key={c.slug ?? 'all'}
        onPress={() => onChange(c.slug)}
        style={[styles.chip, active && { backgroundColor: tint, borderColor: tint }]}
      >
        <Text style={[styles.text, active && styles.textActive]} numberOfLines={1}>
          {c.icon ? `${c.icon}  ` : ''}{c.name}
        </Text>
      </Pressable>
    );
  });

  if (wrap) return <>{chips}</>;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroller}
      contentContainerStyle={styles.row}
    >
      {chips}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // ScrollView grows to fill its parent by default — stop it so the row is only as tall as the chips.
  scroller: { flexGrow: 0, flexShrink: 0 },
  row: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  text: { fontSize: 13, color: colors.text, fontWeight: '600' },
  textActive: { color: '#fff' },
});
