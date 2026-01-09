import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, Text, TextInput, Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthErrorMessage, getFirebaseErrorCode } from '@/utils';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await login(email.trim(), password);
      // Navigation is handled by the root layout based on auth state
    } catch (err) {
      const errorCode = getFirebaseErrorCode(err);
      setError(getAuthErrorMessage(errorCode));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scrollable keyboardAvoiding>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text size="xxxl" weight="bold" color="gold" style={styles.logo}>
            ))
          </Text>
          <Text size="xl" weight="semibold">
            Sign In
          </Text>
          <Text size="sm" color="subtle" style={styles.subtitle}>
            Lorem ipsum dolor sit amet
          </Text>
        </View>

        <View style={styles.form}>
          {error && (
            <View style={styles.errorContainer}>
              <Text size="sm" color="love">
                {error}
              </Text>
            </View>
          )}

          <TextInput
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <View style={styles.inputSpacing} />

          <TextInput
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <Pressable style={styles.forgotPassword} onPress={() => router.push('/(auth)/forgot-password')}>
            <Text size="sm" color="subtle">
              Forgot password?
            </Text>
          </Pressable>

          <Button title="SIGN IN" variant="primary" onPress={handleLogin} loading={loading} fullWidth />
        </View>

        <View style={styles.footer}>
          <Text size="sm" color="subtle">
            Don't have an account?{' '}
          </Text>
          <Pressable onPress={() => router.push('/(auth)/signup')}>
            <Text size="sm" color="gold" weight="semibold">
              Sign Up
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
    paddingTop: 48,
  },
  logo: {
    fontSize: 48,
    marginBottom: 16,
  },
  subtitle: {
    marginTop: 4,
  },
  form: {
    flex: 1,
  },
  errorContainer: {
    marginBottom: 16,
    padding: 12,
  },
  inputSpacing: {
    height: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 24,
  },
});
