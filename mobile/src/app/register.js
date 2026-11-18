import { Text } from 'react-native';
import { router } from 'expo-router';
import AuthForm from '../components/AuthForm';
import { useAuth } from '../context/AuthContext';
import { colors } from '../lib/theme';

export default function RegisterScreen() {
  const { register } = useAuth();
  return (
    <AuthForm
      heading="Create an account"
      subheading="Join your community in reporting incidents."
      submitLabel="Sign up"
      fields={[
        { key: 'name', label: 'Full name', placeholder: 'Jane Doe', autoComplete: 'name' },
        { key: 'email', label: 'Email', placeholder: 'you@example.com', keyboardType: 'email-address', autoCapitalize: 'none', autoComplete: 'email' },
        { key: 'password', label: 'Password', placeholder: 'At least 6 characters', secureTextEntry: true, autoComplete: 'new-password' },
      ]}
      onSubmit={({ name = '', email = '', password = '' }) => register(name.trim(), email.trim(), password)}
      footer={
        <Text style={{ textAlign: 'center', marginTop: 16, color: colors.muted }}>
          Already have an account?{' '}
          <Text style={{ color: colors.primary, fontWeight: '700' }} onPress={() => router.replace('/login')}>Log in</Text>
        </Text>
      }
    />
  );
}
