import { FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useCategories from '../../hooks/useCategories';
import useResponsive from '../../hooks/useResponsive';
import { categoryColor, colors } from '../../lib/theme';

export default function CategoriesScreen() {
  const { categories, error, reload } = useCategories();
  const { width, maxContent, isTablet } = useResponsive();
  const columns = width >= 1100 ? 4 : width >= 700 ? 3 : 2;
  const GAP = 14;

  return (
    <FlatList
      key={`cols-${columns}`}
      data={categories}
      keyExtractor={(c) => c.slug}
      numColumns={columns}
      contentContainerStyle={{
        width: '100%', maxWidth: maxContent, alignSelf: 'center',
        padding: (isTablet ? 24 : 16) - GAP / 2, paddingBottom: 32,
      }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}
      ListHeaderComponent={
        <Text style={[styles.intro, { marginHorizontal: GAP / 2 }]}>
          Pick a category to see every incident of that type.
        </Text>
      }
      ListEmptyComponent={error ? <Text style={styles.error}>{error}</Text> : null}
      renderItem={({ item }) => {
        const c = categoryColor(item.slug);
        return (
          <View style={{ width: `${100 / columns}%`, padding: GAP / 2 }}>
            <Pressable
              style={({ pressed, hovered }) => [styles.tile, hovered && styles.hovered, pressed && { opacity: 0.85 }]}
              onPress={() => router.push({ pathname: '/category/[slug]', params: { slug: item.slug, name: item.name } })}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${c}18` }]}>
                <Text style={styles.icon}>{item.icon}</Text>
              </View>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <View style={styles.bottom}>
                <Text style={[styles.countText, { color: c }]}>
                  {item.count} {item.count === 1 ? 'report' : 'reports'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={c} />
              </View>
              <View style={[styles.bar, { backgroundColor: c }]} />
            </Pressable>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, color: colors.muted, marginTop: 8, marginBottom: 6 },
  tile: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    gap: 10,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E5EA',
    // Flat on phones; soft shadow + hover lift on web only.
    ...Platform.select({
      web: { cursor: 'pointer', transitionDuration: '150ms', boxShadow: '0 2px 10px rgba(15, 23, 42, 0.06)' },
    }),
  },
  hovered: { transform: [{ translateY: -3 }], boxShadow: '0 10px 28px rgba(15, 23, 42, 0.14)' },
  iconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 30 },
  name: { fontSize: 16, fontWeight: '800', color: colors.text },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countText: { fontSize: 13, fontWeight: '700' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4 },
  error: { color: colors.muted, textAlign: 'center', marginTop: 40 },
});
