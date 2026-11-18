import { Text } from 'react-native';
import { router } from 'expo-router';
import AuthForm from '../components/AuthForm';
import { useAuth } from '../context/AuthContext';
import { colors } from '../lib/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  return (
    <AuthForm
      heading="Welcome back"
      subheading="Log in to report incidents and view your submissions."
      submitLabel="Log in"
      fields={[
        { key: 'email', label: 'Email', placeholder: 'you@example.com', keyboardType: 'email-address', autoCapitalize: 'none', autoComplete: 'email' },
        { key: 'password', label: 'Password', placeholder: '••••••', secureTextEntry: true, autoComplete: 'password' },
      ]}
      onSubmit={({ email = '', password = '' }) => login(email.trim(), password)}
      footer={
        <Text style={{ textAlign: 'center', marginTop: 16, color: colors.muted }}>
          No account?{' '}
          <Text style={{ color: colors.primary, fontWeight: '700' }} onPress={() => router.replace('/register')}>Sign up</Text>
        </Text>
      }
    />
  );
}
