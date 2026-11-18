/** Web fallback: OpenStreetMap embed (react-native-maps is native-only). */
export default function IncidentMap({ latitude, longitude, height = 200 }) {
  const d = 0.005;
  const bbox = [longitude - d, latitude - d, longitude + d, latitude + d].join(',');
  return (
    <iframe
      title="Incident location"
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`}
      style={{ width: '100%', height, border: 0, borderRadius: 12 }}
    />
  );
}
