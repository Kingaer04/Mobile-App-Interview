import { useCallback } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import IncidentList from '../../components/IncidentList';
import { api } from '../../lib/api';

export default function CategoryScreen() {
  const { slug, name } = useLocalSearchParams();
  const fetchPage = useCallback((page, limit) => api.incidents({ category: slug, page, limit }), [slug]);

  return (
    <>
      <Stack.Screen options={{ title: name || 'Category' }} />
      <IncidentList fetchPage={fetchPage} deps={[slug]} title={name ? `All ${name} reports` : undefined}emptyText="No incidents in this category yet." />
    </>
  );
}
