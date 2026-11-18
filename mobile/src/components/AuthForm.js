import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Button from './Button';
import { colors } from '../lib/theme';
import { PAGE_WIDTH } from '../hooks/useResponsive';

/** Shared login / register form. `fields` is a list of { key, label, ...TextInput props }. */
export default function AuthForm({ heading, subheading, fields, submitLabel, onSubmit, footer }) {
  const [values, setValues] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await onSubmit(values);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>🚨</Text>
        <Text style={styles.heading}>{heading}</Text>
        <Text style={styles.sub}>{subheading}</Text>
        {fields.map(({ key, label, ...props }) => (
          <View key={key}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor={colors.muted}
              value={values[key] || ''}
              onChangeText={(t) => setValues((v) => ({ ...v, [key]: t }))}
              onSubmitEditing={submit}
              {...props}
            />
          </View>
        ))}
        {error && <Text style={styles.error}>{error}</Text>}
        <Button title={submitLabel} onPress={submit} loading={loading} style={{ marginTop: 20 }} />
        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 4, width: '100%', maxWidth: PAGE_WIDTH.auth, alignSelf: 'center' },
  logo: { fontSize: 48, textAlign: 'center', marginTop: 12 },
  heading: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
  sub: { fontSize: 15, color: colors.muted, textAlign: 'center', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text,
  },
  error: { color: colors.primary, marginTop: 12, textAlign: 'center' },
});
