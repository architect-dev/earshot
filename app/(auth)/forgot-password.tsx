import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, Text, TextInput, Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { validateEmail } from '@/utils/validation';
import { getAuthErrorMessage, getFirebaseErrorCode } from '@/utils/errors';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    setError(null);

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setLoading(true);

    try {
      await sendPasswordReset(email.trim());
      setSuccess(true);
    } catch (err) {
      const errorCode = getFirebaseErrorCode(err);
      setError(getAuthErrorMessage(errorCode));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <View style={styles.content}>
            <Text size="xxxl" weight="bold" color="gold" style={styles.logo}>
              ))
            </Text>
            <Text size="xl" weight="semibold" align="center">
              Check Your Email
            </Text>
            <Text size="md" color="subtle" align="center" style={styles.successMessage}>
              We've sent password reset instructions to your email address.
            </Text>
            <Button
              title="BACK TO SIGN IN"
              variant="secondary"
              onPress={() => router.back()}
              style={styles.backButton}
            />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable keyboardAvoiding>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text size="xxxl" weight="bold" color="gold" style={styles.logo}>
            ))
          </Text>
          <Text size="xl" weight="semibold">
            Reset Password
          </Text>
          <Text size="sm" color="subtle" style={styles.subtitle}>
            Enter your email to receive reset instructions
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

          <View style={styles.buttonSpacing} />

          <Button title="SEND RESET LINK" variant="primary" onPress={handleReset} loading={loading} fullWidth />
        </View>

        <View style={styles.footer}>
          <Pressable onPress={() => router.back()}>
            <Text size="sm" color="gold" weight="semibold">
              Back to Sign In
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
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
  buttonSpacing: {
    height: 24,
  },
  successMessage: {
    marginTop: 16,
    marginBottom: 32,
  },
  backButton: {
    marginTop: 16,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
});
