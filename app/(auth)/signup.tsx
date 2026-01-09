import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, Text, TextInput, Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { validateUsername, validatePassword, validateEmail } from '@/utils/validation';
import { getAuthErrorMessage, getFirebaseErrorCode } from '@/utils/errors';
import { COLLECTIONS, queryDocuments, where } from '@/services/firebase';

export default function SignupScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    const usernameError = validateUsername(username);
    if (usernameError) newErrors.username = usernameError;

    if (!fullName.trim()) {
      newErrors.fullName = 'Lorem ipsum required';
    } else if (fullName.length > 32) {
      newErrors.fullName = 'Lorem ipsum max 32';
    }

    const emailError = validateEmail(email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validatePassword(password);
    if (passwordError) newErrors.password = passwordError;

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Lorem ipsum mismatch';
    }

    // Check username uniqueness
    if (!newErrors.username) {
      try {
        const existingUsers = await queryDocuments(COLLECTIONS.USERS, [
          where('username', '==', username.toLowerCase()),
        ]);
        if (existingUsers.length > 0) {
          newErrors.username = 'Lorem ipsum already taken';
        }
      } catch {
        // If query fails, let server-side validation handle it
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    const isValid = await validate();
    if (!isValid) return;

    setLoading(true);

    try {
      await register(email.trim(), password, {
        username: username.toLowerCase(),
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
      });
      // Navigation is handled by the root layout based on auth state
    } catch (err) {
      const errorCode = getFirebaseErrorCode(err);
      setErrors({ form: getAuthErrorMessage(errorCode) });
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
            Lorem ipsum
          </Text>
          <Text size="sm" color="subtle" style={styles.subtitle}>
            Lorem ipsum dolor sit amet
          </Text>
        </View>

        <View style={styles.form}>
          {errors.form && (
            <View style={styles.errorContainer}>
              <Text size="sm" color="love">
                {errors.form}
              </Text>
            </View>
          )}

          <TextInput
            label="Username"
            placeholder="lorem_ipsum"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoComplete="username"
            error={errors.username}
            hint="Lorem ipsum 24 chars, a-z, 0-9, _"
          />

          <View style={styles.inputSpacing} />

          <TextInput
            label="Full Name"
            placeholder="Lorem Ipsum"
            value={fullName}
            onChangeText={setFullName}
            autoComplete="name"
            error={errors.fullName}
          />

          <View style={styles.inputSpacing} />

          <TextInput
            label="Email"
            placeholder="lorem@ipsum.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
          />

          <View style={styles.inputSpacing} />

          <TextInput
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            error={errors.password}
            hint="Lorem ipsum 8+ chars, upper, lower, number, special"
          />

          <View style={styles.inputSpacing} />

          <TextInput
            label="Confirm Password"
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="new-password"
            error={errors.confirmPassword}
          />

          <View style={styles.buttonSpacing} />

          <Button title="CREATE ACCOUNT" variant="primary" onPress={handleSignup} loading={loading} fullWidth />
        </View>

        <View style={styles.footer}>
          <Text size="sm" color="subtle">
            Lorem ipsum dolor sit amet?{' '}
          </Text>
          <Pressable onPress={() => router.back()}>
            <Text size="sm" color="gold" weight="semibold">
              Lorem ipsum
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
    marginBottom: 32,
    paddingTop: 24,
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
  buttonSpacing: {
    height: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 24,
  },
});
