import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, Text, Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { user, isEmailVerified, sendVerificationEmail, logout, refreshAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Manual check for verification status - uses refreshAuth to update context state
  const checkVerification = useCallback(async () => {
    try {
      const verified = await refreshAuth();
      // The root layout will handle navigation when isEmailVerified updates in context
      return verified;
    } catch {
      // Ignore errors during check
    }
    return false;
  }, [refreshAuth]);

  // Check on mount and when isEmailVerified changes
  useEffect(() => {
    if (isEmailVerified) {
      router.replace('/(tabs)/feed');
    }
  }, [isEmailVerified, router]);

  // Poll for verification status every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      checkVerification();
    }, 5000);

    return () => clearInterval(interval);
  }, [checkVerification]);

  const handleCheckStatus = async () => {
    setChecking(true);
    setError(null);
    setMessage(null);

    const verified = await checkVerification();
    if (!verified) {
      setMessage('Email not yet verified. Please check your inbox.');
    }

    setChecking(false);
  };

  const handleResend = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      await sendVerificationEmail();
      setMessage('Verification email sent!');
    } catch {
      setError('Failed to send email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text size="xxxl" weight="bold" color="gold" style={styles.logo}>
            ))
          </Text>
          <Text size="xl" weight="semibold" align="center">
            Verify Your Email
          </Text>
          <Text size="md" color="subtle" align="center" style={styles.subtitle}>
            We've sent a verification link to your email address. Please check your inbox and click the link to
            continue.
          </Text>
          <Text size="sm" color="muted" align="center" style={styles.email}>
            {user?.email}
          </Text>

          {message && (
            <Text size="sm" color="pine" align="center" style={styles.message}>
              {message}
            </Text>
          )}

          {error && (
            <Text size="sm" color="love" align="center" style={styles.message}>
              {error}
            </Text>
          )}

          <View style={styles.buttons}>
            <Button
              title="I'VE VERIFIED MY EMAIL"
              variant="primary"
              onPress={handleCheckStatus}
              loading={checking}
              fullWidth
            />
            <Button
              title="RESEND EMAIL"
              variant="secondary"
              onPress={handleResend}
              loading={loading}
              fullWidth
              style={styles.resendButton}
            />
            <Button title="SIGN OUT" variant="ghost" onPress={handleLogout} style={styles.logoutButton} />
          </View>
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
  logo: {
    fontSize: 48,
    marginBottom: 24,
  },
  subtitle: {
    marginTop: 12,
    marginBottom: 8,
  },
  email: {
    marginBottom: 24,
  },
  message: {
    marginBottom: 16,
  },
  buttons: {
    width: '100%',
    marginTop: 16,
  },
  resendButton: {
    marginTop: 12,
  },
  logoutButton: {
    marginTop: 16,
  },
});
