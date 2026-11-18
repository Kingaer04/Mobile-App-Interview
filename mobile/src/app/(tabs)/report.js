import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import useCategories from '../../hooks/useCategories';
import CategoryChips from '../../components/CategoryChips';
import LoginPrompt from '../../components/LoginPrompt';
import IncidentMap from '../../components/IncidentMap';
import Button from '../../components/Button';
import { api } from '../../lib/api';
import { colors } from '../../lib/theme';
import { PAGE_WIDTH } from '../../hooks/useResponsive';

const MAX_IMAGES = 5;

const notify = (title, msg) => (Platform.OS === 'web' ? window.alert(`${title}\n\n${msg}`) : Alert.alert(title, msg));

function formatAddress(a) {
  if (!a) return '';
  return [a.name !== a.street ? a.name : null, a.street, a.district || a.subregion, a.city, a.region]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(', ');
}

export default function ReportScreen() {
  const { user } = useAuth();
  const { categories } = useCategories();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(null);
  const [images, setImages] = useState([]);
  const [coords, setCoords] = useState(null);
  const [address, setAddress] = useState('');
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const locate = useCallback(async () => {
    setLocating(true);
    setLocError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission was denied. Enable it in settings to report incidents.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = pos.coords;
      setCoords({ latitude, longitude, accuracy: pos.coords.accuracy });
      if (Platform.OS !== 'web') {
        try {
          const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
          setAddress((prev) => prev || formatAddress(place));
        } catch { /* address is optional */ }
      }
    } catch (e) {
      setLocError(e.message);
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => { if (user) locate(); }, [user, locate]);

  const addImages = async (fromCamera) => {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) return notify('Limit reached', `You can attach up to ${MAX_IMAGES} pictures.`);
    const opts = { mediaTypes: ['images'], quality: 0.6, exif: false };
    let result;
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return notify('Camera blocked', 'Allow camera access to take pictures of the incident.');
      result = await ImagePicker.launchCameraAsync(opts);
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ ...opts, allowsMultipleSelection: true, selectionLimit: remaining });
    }
    if (!result.canceled) setImages((prev) => [...prev, ...result.assets].slice(0, MAX_IMAGES));
  };

  const reset = () => {
    setTitle(''); setDescription(''); setCategory(null); setImages([]); setAddress('');
    locate();
  };

  const submit = async () => {
    if (!category) return notify('Missing category', 'Please choose what kind of incident this is.');
    if (!title.trim()) return notify('Missing title', 'Please give a short title for the incident.');
    if (!coords) return notify('Missing location', 'We need your location to report the incident. Tap "Refresh location".');
    setSubmitting(true);
    try {
      const incident = await api.createIncident({
        title: title.trim(),
        description: description.trim(),
        category,
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: address.trim(),
        images,
      });
      reset();
      router.push(`/incident/${incident.id}`);
    } catch (e) {
      notify('Could not submit', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return <LoginPrompt message="Log in to report incidents and keep track of the reports you submit." />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>What happened? *</Text>
        <View style={styles.chipWrap}>
          <CategoryChips categories={categories} value={category} onChange={setCategory} wrap />
        </View>

        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Two-car collision at the junction"
          placeholderTextColor={colors.muted}
          value={title}
          onChangeText={setTitle}
          maxLength={120}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, { height: 110, textAlignVertical: 'top' }]}
          placeholder="Describe what you saw: people involved, injuries, vehicles, etc."
          placeholderTextColor={colors.muted}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={2000}
        />

        <Text style={styles.label}>Pictures ({images.length}/{MAX_IMAGES})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {images.map((img, i) => (
            <View key={img.uri}>
              <Image source={{ uri: img.uri }} style={styles.thumb} />
              <Pressable style={styles.remove} onPress={() => setImages((p) => p.filter((_, j) => j !== i))} hitSlop={8}>
                <Ionicons name="close" size={14} color="#fff" />
              </Pressable>
            </View>
          ))}
          {images.length < MAX_IMAGES && (
            <>
              <Pressable style={styles.addTile} onPress={() => addImages(true)}>
                <Ionicons name="camera-outline" size={26} color={colors.primary} />
                <Text style={styles.addText}>Camera</Text>
              </Pressable>
              <Pressable style={styles.addTile} onPress={() => addImages(false)}>
                <Ionicons name="images-outline" size={26} color={colors.primary} />
                <Text style={styles.addText}>Gallery</Text>
              </Pressable>
            </>
          )}
        </ScrollView>

        <View style={styles.locHeader}>
          <Text style={styles.label}>Location *</Text>
          <Pressable onPress={locate} disabled={locating} hitSlop={8}>
            <Text style={styles.link}>{locating ? 'Locating…' : 'Refresh location'}</Text>
          </Pressable>
        </View>
        {coords ? (
          <View style={styles.locCard}>
            <IncidentMap latitude={coords.latitude} longitude={coords.longitude} height={150} />
            <Text style={styles.coords}>
              <Ionicons name="navigate" size={13} /> Lat {coords.latitude.toFixed(6)}, Lng {coords.longitude.toFixed(6)}
              {coords.accuracy ? `  (±${Math.round(coords.accuracy)} m)` : ''}
            </Text>
          </View>
        ) : (
          <Text style={[styles.coords, locError && { color: colors.primary }]}>
            {locError || (locating ? 'Getting your current location…' : 'Location not available yet.')}
          </Text>
        )}
        <TextInput
          style={styles.input}
          placeholder="Address or landmark (optional)"
          placeholderTextColor={colors.muted}
          value={address}
          onChangeText={setAddress}
        />

        <Button title="Submit report" onPress={submit} loading={submitting} style={{ marginTop: 20 }}
          icon={<Ionicons name="send" size={18} color="#fff" />} />
        <Text style={styles.note}>Your report is published immediately and other users are notified.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40, width: '100%', maxWidth: PAGE_WIDTH.form, alignSelf: 'center' },
  label: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  thumb: { width: 90, height: 90, borderRadius: 10, backgroundColor: colors.border },
  remove: {
    position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center',
  },
  addTile: {
    width: 90, height: 90, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: `${colors.primary}0D`,
  },
  addText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  locHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  link: { color: colors.primary, fontWeight: '600', marginBottom: 8 },
  locCard: { gap: 8, marginBottom: 10, borderRadius: 12, overflow: 'hidden' },
  coords: { fontSize: 13, color: colors.muted, marginBottom: 10 },
  note: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 10 },
});
