import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

/** Native map with a single pin. (Web uses IncidentMap.web.js.) */
export default function IncidentMap({ latitude, longitude, title, height = 200 }) {
  return (
    <MapView
      style={[styles.map, { height }]}
      region={{ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
      scrollEnabled={false}
    >
      <Marker coordinate={{ latitude, longitude }} title={title} />
    </MapView>
  );
}

const styles = StyleSheet.create({ map: { width: '100%', borderRadius: 12 } });
