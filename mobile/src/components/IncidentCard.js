import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Scrim from './Scrim';
import Avatar from './Avatar';
import LazyImage from './LazyImage';
import { categoryColor, colors, timeAgo } from '../lib/theme';

const isWeb = Platform.OS === 'web';

/**
 * Card surface shared with the skeleton. Phones get a flat card with a hairline border
 * (Android `elevation` shadows look muddy); web keeps a soft CSS shadow.
 */
export const cardSurface = {
  flex: 1,
  backgroundColor: colors.card,
  borderRadius: 16,
  overflow: 'hidden',
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: '#E2E5EA',
  ...(isWeb && { boxShadow: '0 2px 10px rgba(15, 23, 42, 0.06)' }),
};

export function CategoryBadge({ category, small, solid }) {
  const c = categoryColor(category.slug);
  return (
    <View
      style={[
        styles.badge,
        // `solid` = on top of a photo: opaque white so it stays readable over any image colour.
        solid ? styles.badgeOnPhoto : { backgroundColor: `${c}18` },
        small && styles.badgeSmall,
      ]}
    >
      <Text style={[styles.badgeText, { color: c }]}>
        {category.icon}  {category.name}
      </Text>
    </View>
  );
}

const place = (i) => i.address || `${i.latitude.toFixed(4)}, ${i.longitude.toFixed(4)}`;

/** Decorative header for reports without photos: tinted panel with the category emoji. */
function NoPhotoMedia({ incident, tint }) {
  return (
    <View style={[styles.noPhoto, { backgroundColor: `${tint}14` }]}>
      {/* faint scattered emoji pattern */}
      {[[8, 12, 34], [70, 6, 22], [82, 58, 40], [22, 64, 26], [48, 30, 18]].map(([l, t, s], i) => (
        <Text key={i} style={[styles.pattern, { left: `${l}%`, top: `${t}%`, fontSize: s }]}>{incident.category.icon}</Text>
      ))}
      <View style={[styles.noPhotoIcon, { borderColor: `${tint}40` }]}>
        <Text style={{ fontSize: 34 }}>{incident.category.icon}</Text>
      </View>
      <Text style={[styles.noPhotoText, { color: tint }]}>No photos attached</Text>
    </View>
  );
}

export default function IncidentCard({ incident, onLongPress, mediaHeight = 190, style }) {
  const cover = incident.images[0];
  const tint = categoryColor(incident.category.slug);

  return (
    <Pressable
      onPress={() => router.push(`/incident/${incident.id}`)}
      onLongPress={onLongPress}
      style={({ pressed, hovered }) => [
        styles.card,
        hovered && styles.hovered,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={{ height: mediaHeight }}>
        {cover ? (
          <>
            <LazyImage uri={cover} tint={tint} style={StyleSheet.absoluteFill} />
            <Scrim height={mediaHeight * 0.55} />
          </>
        ) : (
          <NoPhotoMedia incident={incident} tint={tint} />
        )}

        <View style={styles.overlayTop}>
          <CategoryBadge category={incident.category} small solid />
          <View style={styles.darkPill}>
            <Ionicons name="time-outline" size={11} color="#fff" />
            <Text style={styles.darkPillText}>{timeAgo(incident.createdAt)}</Text>
          </View>
        </View>

        {cover && (
          <View style={styles.overlayBottom}>
            <View style={styles.row}>
              <Ionicons name="location-sharp" size={13} color="#fff" />
              <Text style={styles.photoLocation} numberOfLines={1}>{place(incident)}</Text>
            </View>
            {incident.images.length > 1 && (
              <View style={styles.darkPill}>
                <Ionicons name="images" size={11} color="#fff" />
                <Text style={styles.darkPillText}>{incident.images.length}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={[styles.accent, { backgroundColor: tint }]} />

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{incident.title}</Text>
        <Text style={styles.desc} numberOfLines={2}>
          {incident.description || 'No description provided.'}
        </Text>
        {!cover && (
          <View style={[styles.row, { marginTop: 2 }]}>
            <Ionicons name="location-sharp" size={13} color={tint} />
            <Text style={styles.meta} numberOfLines={1}>{place(incident)}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <View style={[styles.row, { flexShrink: 1 }]}>
            <Avatar name={incident.user.name} size={26} />
            <Text style={styles.reporter} numberOfLines={1}>{incident.user.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.view, { color: tint }]}>View</Text>
            <Ionicons name="arrow-forward" size={14} color={tint} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...cardSurface,
    ...(isWeb && { cursor: 'pointer', transitionDuration: '150ms', transitionProperty: 'transform, box-shadow' }),
  },
  hovered: { transform: [{ translateY: -3 }], boxShadow: '0 10px 28px rgba(15, 23, 42, 0.14)' },
  pressed: { opacity: 0.85 },

  overlayTop: {
    position: 'absolute', top: 12, left: 12, right: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  overlayBottom: {
    position: 'absolute', left: 14, right: 12, bottom: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8,
  },
  photoLocation: { color: '#fff', fontSize: 13, fontWeight: '600', flexShrink: 1, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4 },
  darkPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(15,23,42,0.65)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4,
  },
  darkPillText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  noPhoto: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' },
  pattern: { position: 'absolute', opacity: 0.12 },
  noPhotoIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', borderWidth: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  noPhotoText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },

  accent: { height: 3 },
  body: { padding: 16, paddingTop: 14, gap: 6, flex: 1 },
  title: { fontSize: 17, fontWeight: '800', color: colors.text, lineHeight: 22 },
  desc: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontSize: 13, color: colors.muted, flexShrink: 1 },
  footer: {
    marginTop: 'auto', paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  },
  reporter: { fontSize: 13, color: colors.text, fontWeight: '600', flexShrink: 1 },
  view: { fontSize: 13, fontWeight: '700' },

  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeSmall: { paddingHorizontal: 10, paddingVertical: 4 },
  badgeOnPhoto: { backgroundColor: 'rgba(255,255,255,0.96)' },
  badgeText: { fontSize: 12, fontWeight: '700' },
});
