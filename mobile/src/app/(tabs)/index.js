import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import IncidentList from '../../components/IncidentList';
import CategoryChips from '../../components/CategoryChips';
import useCategories from '../../hooks/useCategories';
import useResponsive from '../../hooks/useResponsive';
import { api } from '../../lib/api';
import { colors } from '../../lib/theme';

export default function FeedScreen() {
  const { categories } = useCategories();
  const { maxContent, isTablet } = useResponsive();
  const [category, setCategory] = useState(null);

  const fetchPage = useCallback((page, limit) => api.incidents({ category, page, limit }), [category]);
  const selected = categories.find((c) => c.slug === category);

  return (
    <View style={styles.screen}>
      <View style={styles.filterBar}>
        <View style={{ width: '100%', maxWidth: maxContent, alignSelf: 'center', paddingHorizontal: isTablet ? 8 : 0 }}>
          <CategoryChips categories={categories} value={category} onChange={setCategory} allLabel="All" />
        </View>
      </View>
      <IncidentList
        fetchPage={fetchPage}
        deps={[category]}
        title={selected ? `${selected.icon}  ${selected.name}` : 'Latest reports'}
        emptyText={category ? 'No incidents in this category yet.' : 'No incidents have been reported yet.'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  filterBar: {
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
