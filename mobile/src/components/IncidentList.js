import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import IncidentCard from './IncidentCard';
import SkeletonCard from './SkeletonCard';
import Pagination from './Pagination';
import { useLive } from '../context/LiveContext';
import useResponsive from '../hooks/useResponsive';
import { PAGE_SIZE } from '../lib/api';
import { colors } from '../lib/theme';

const GAP = 16;
/** Cards per page in numbered-page mode (phones). */
export const MOBILE_PAGE_SIZE = 5;

/**
 * Responsive incident list with two loading strategies:
 *  - Phones: numbered pagination — 5 cards per page with Prev · 1 2 3 · Next controls.
 *  - Tablet / desktop: multi-column grid with infinite scroll (next page loads near the end).
 * Both use FlatList virtualisation, so off-screen cards (and their photos) load lazily,
 * and show skeleton cards while a page is loading.
 *
 * `fetchPage(page, limit)` must return { items, hasMore, total }.
 * Reloads when `deps` change or when a live incident event arrives.
 */
export default function IncidentList({
  fetchPage, deps = [], header, title, emptyText = 'No incidents yet.', onLongPressItem,
}) {
  const { version } = useLive();
  const { columns, maxContent, isTablet } = useResponsive();
  const paged = !isTablet;
  const limit = paged ? MOBILE_PAGE_SIZE : PAGE_SIZE;

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingPage, setLoadingPage] = useState(true); // skeletons replace the list
  const [loadingMore, setLoadingMore] = useState(false); // infinite-scroll footer spinner
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const reqId = useRef(0);
  const busy = useRef(false); // prevents duplicate page requests
  const listRef = useRef(null);

  /**
   * mode: 'replace' → show skeletons and swap in page `p`
   *       'refresh' → pull-to-refresh / live update, keep current cards until new ones arrive
   *       'append'  → infinite scroll, add page `p` below current cards
   */
  const load = useCallback(async (p, mode = 'replace') => {
    const id = ++reqId.current;
    busy.current = true;
    setError(null);
    if (mode === 'refresh') setRefreshing(true);
    else if (mode === 'append') setLoadingMore(true);
    else { setLoadingPage(true); setItems([]); }
    try {
      const res = await fetchPage(p, limit);
      if (id !== reqId.current) return; // a newer request superseded this one
      // A deletion can leave the current page empty — step back to the last page that exists.
      if (!res.items.length && p > 1 && mode !== 'append') {
        busy.current = false;
        return load(Math.max(1, Math.ceil(res.total / limit)), mode);
      }
      setItems((prev) => (mode === 'append'
        ? [...prev, ...res.items.filter((n) => !prev.some((o) => o.id === n.id))]
        : res.items));
      setHasMore(res.hasMore);
      setTotal(res.total);
      setPage(p);
    } catch (e) {
      if (id === reqId.current) setError(e.message);
    } finally {
      if (id === reqId.current) {
        busy.current = false;
        setLoadingPage(false); setLoadingMore(false); setRefreshing(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, limit]);

  // First page whenever filters or layout mode change.
  useEffect(() => { load(1); }, [load]);

  // Live updates: phones refresh the page they're on; grid view reloads from the top.
  const pageRef = useRef(page);
  pageRef.current = page;
  useEffect(() => {
    if (version) load(paged ? pageRef.current : 1, 'refresh');
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToPage = (p) => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    load(p);
  };

  const loadMore = () => {
    if (paged || busy.current || !hasMore || error || items.length === 0) return;
    load(page + 1, 'append');
  };

  const refresh = () => load(paged ? page : 1, 'refresh');

  const totalPages = total ? Math.ceil(total / limit) : 0;
  const pad = isTablet ? 24 : 16;
  const mediaHeight = columns > 1 ? 180 : 190;
  const cell = { width: `${100 / columns}%`, paddingHorizontal: GAP / 2, paddingBottom: GAP };

  const skeletons = (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: paged ? 2 : columns * 2 }, (_, i) => (
        <View key={i} style={cell}><SkeletonCard mediaHeight={mediaHeight} /></View>
      ))}
    </View>
  );

  let footer = null;
  if (paged) {
    if (totalPages > 1 && !(loadingPage && !items.length && total == null)) {
      footer = (
        <View style={{ paddingHorizontal: GAP / 2 }}>
          <Pagination page={page} totalPages={totalPages} onChange={goToPage} disabled={loadingPage} />
          <Text style={styles.pageInfo}>
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </Text>
        </View>
      );
    }
  } else if (loadingMore) {
    footer = (
      <View style={styles.footer}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.footerText}>Loading more reports…</Text>
      </View>
    );
  } else if (error && items.length) {
    footer = (
      <View style={styles.footer}>
        <Text style={styles.footerText}>{error}</Text>
        <Text style={styles.retry} onPress={() => load(page + 1, 'append')}>Retry</Text>
      </View>
    );
  } else if (!hasMore && items.length > 0) {
    footer = (
      <View style={styles.footer}>
        <Ionicons name="checkmark-circle" size={18} color={colors.muted} />
        <Text style={styles.footerText}>You're all caught up</Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      key={`cols-${columns}`} // FlatList can't change numColumns on the fly
      data={items}
      numColumns={columns}
      keyExtractor={(i) => String(i.id)}
      renderItem={({ item }) => (
        <View style={cell}>
          <IncidentCard
            incident={item}
            mediaHeight={mediaHeight}
            onLongPress={onLongPressItem ? () => onLongPressItem(item, refresh) : undefined}
          />
        </View>
      )}
      // --- lazy rendering / virtualisation ---
      // Paged mode holds only 5 cards, so render them all at once; grid mode renders in small batches.
      initialNumToRender={paged ? MOBILE_PAGE_SIZE : 4}
      maxToRenderPerBatch={paged ? MOBILE_PAGE_SIZE : 4}
      updateCellsBatchingPeriod={60}
      windowSize={7}
      removeClippedSubviews={Platform.OS === 'android'}
      onEndReached={loadMore}
      onEndReachedThreshold={0.6}
      // ---------------------------------------
      ListHeaderComponent={
        <View style={{ paddingHorizontal: GAP / 2 }}>
          {header}
          {title && (
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{title}</Text>
              {total != null && (
                <Text style={styles.count}>
                  {paged && totalPages > 1 ? `Page ${page} of ${totalPages}` : `${total} ${total === 1 ? 'report' : 'reports'}`}
                </Text>
              )}
            </View>
          )}
        </View>
      }
      style={{ flex: 1 }}
      contentContainerStyle={[
        styles.content,
        { maxWidth: maxContent, paddingHorizontal: pad - GAP / 2, paddingTop: title ? 4 : pad },
      ]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      ListEmptyComponent={
        loadingPage ? skeletons : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name={error ? 'cloud-offline-outline' : 'file-tray-outline'} size={36} color={colors.muted} />
            </View>
            <Text style={styles.emptyText}>{error || emptyText}</Text>
            {error && <Text style={styles.retry} onPress={() => load(page)}>Tap to retry</Text>}
          </View>
        )
      }
      ListFooterComponent={footer}
    />
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', alignSelf: 'center', paddingBottom: 32, flexGrow: 1 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 18, paddingBottom: 14 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  count: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  pageInfo: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 4, marginBottom: 8 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20 },
  footerText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.muted, fontSize: 15, textAlign: 'center', maxWidth: 360 },
  retry: { color: colors.primary, fontWeight: '700', fontSize: 14 },
});
