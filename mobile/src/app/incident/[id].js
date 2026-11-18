import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, Linking, Platform, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import useResponsive, { PAGE_WIDTH } from '../../hooks/useResponsive';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CategoryBadge } from '../../components/IncidentCard';
import IncidentMap from '../../components/IncidentMap';
import Button from '../../components/Button';
import { api } from '../../lib/api';
import { colors } from '../../lib/theme';

function openInMaps({ latitude, longitude, title }) {
  const label = encodeURIComponent(title);
  const url = Platform.select({
    ios: `http://maps.apple.com/?ll=${latitude},${longitude}&q=${label}`,
    android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`,
    default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
  });
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`));
}

export default function IncidentDetail() {
  const { id } = useLocalSearchParams();
  const [incident, setIncident] = useState(null);
  const [error, setError] = useState(null);
  const [slide, setSlide] = useState(0);
  const { width, isTablet } = useResponsive();
  // On wide screens the page is a centred column with a rounded gallery; on phones the gallery is edge to edge.
  const framed = isTablet;
  const WIDTH = framed ? Math.min(width - 48, PAGE_WIDTH.detail) : width;

  useEffect(() => {
    setIncident(null);
    api.incident(id).then(setIncident).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <View style={styles.center}><Text style={styles.muted}>{error}</Text></View>;
  if (!incident) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;

  const created = new Date(incident.createdAt);

  return (
    <ScrollView
      contentContainerStyle={{
        paddingBottom: 32, width: '100%', maxWidth: PAGE_WIDTH.detail, alignSelf: 'center',
        paddingTop: framed ? 24 : 0,
      }}
    >
      <Stack.Screen options={{ title: incident.category.name }} />

      {incident.images.length > 0 && (
        <View style={framed && { borderRadius: 18, overflow: 'hidden', width: WIDTH, alignSelf: 'center' }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / WIDTH))}
          >
            {incident.images.map((uri) => (
              <Image key={uri} source={{ uri }} style={{ width: WIDTH, height: framed ? 380 : 260 }} resizeMode="cover" />
            ))}
          </ScrollView>
          {incident.images.length > 1 && (
            <View style={styles.dots}>
              {incident.images.map((u, i) => <View key={u} style={[styles.dot, i === slide && styles.dotActive]} />)}
            </View>
          )}
        </View>
      )}

      <View style={[styles.body, framed && { paddingHorizontal: 0, paddingTop: 20 }]}>
        <CategoryBadge category={incident.category} />
        <Text style={styles.title}>{incident.title}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={15} color={colors.muted} />
          <Text style={styles.muted}>{created.toLocaleDateString()} at {created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="person-outline" size={15} color={colors.muted} />
          <Text style={styles.muted}>Reported by {incident.user.name}</Text>
        </View>

        {!!incident.description && <Text style={styles.desc}>{incident.description}</Text>}

        <Text style={styles.section}>Location</Text>
        <View style={styles.mapWrap}>
          <IncidentMap latitude={incident.latitude} longitude={incident.longitude} title={incident.title} height={200} />
        </View>
        {!!incident.address && (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={15} color={colors.muted} />
            <Text style={styles.text}>{incident.address}</Text>
          </View>
        )}
        <View style={styles.coordBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.coordLabel}>Latitude</Text>
            <Text style={styles.coordValue}>{incident.latitude.toFixed(6)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.coordLabel}>Longitude</Text>
            <Text style={styles.coordValue}>{incident.longitude.toFixed(6)}</Text>
          </View>
        </View>
        <Button title="Open in Maps" variant="outline" onPress={() => openInMaps(incident)}
          icon={<Ionicons name="map-outline" size={18} color={colors.primary} />} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  body: { padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  muted: { color: colors.muted, fontSize: 14 },
  text: { color: colors.text, fontSize: 14, flexShrink: 1 },
  desc: { fontSize: 15, lineHeight: 22, color: colors.text, marginTop: 8 },
  section: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 16 },
  mapWrap: { borderRadius: 12, overflow: 'hidden' },
  coordBox: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12, padding: 12, marginVertical: 6 },
  coordLabel: { fontSize: 12, color: colors.muted },
  coordValue: { fontSize: 15, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, position: 'absolute', bottom: 10, left: 0, right: 0 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff' },
});
