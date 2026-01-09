import { useState } from 'react';
import { View, Pressable, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { FontAwesome6 } from '@expo/vector-icons';
import { ScreenContainer, Text, Button, Avatar, TextInput, Modal, PageHeader } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthErrorMessage, getFirebaseErrorCode } from '@/utils/errors';
import { validateUsername, validateFullName, validatePassword } from '@/utils/validation';

type EditMode = null | 'fullName' | 'username' | 'email' | 'password';

// Helper to get error message from any error
const getErrorMessage = (err: unknown): string => {
  return getAuthErrorMessage(getFirebaseErrorCode(err));
};

export default function ProfileScreen() {
  const { theme, toggleTheme, themeMode } = useTheme();
  const {
    userProfile,
    logout,
    updateProfile,
    updateProfilePhoto,
    updateEmail,
    updatePassword,
    updateUsername,
    deleteUserAccount,
    checkUsernameAvailable,
  } = useAuth();

  const [editMode, setEditMode] = useState<EditMode>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [error, setError] = useState('');

  const resetForm = () => {
    setFullName('');
    setUsername('');
    setNewEmail('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  const openEdit = (mode: EditMode) => {
    resetForm();
    if (mode === 'fullName') setFullName(userProfile?.fullName || '');
    if (mode === 'username') setUsername(userProfile?.username || '');
    if (mode === 'email') setNewEmail(userProfile?.email || '');
    setEditMode(mode);
  };

  const closeEdit = () => {
    setEditMode(null);
    resetForm();
  };

  // Photo picker
  const handlePickPhoto = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setIsLoading(true);
      try {
        // Resize to max 1440px using new API
        const context = ImageManipulator.manipulate(result.assets[0].uri);
        context.resize({ width: 1440, height: 1440 });
        const imageRef = await context.renderAsync();
        const manipulated = await imageRef.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });

        await updateProfilePhoto(manipulated.uri);
      } catch (err) {
        Alert.alert('Error', getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Save handlers
  const handleSaveFullName = async () => {
    const validationError = validateFullName(fullName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await updateProfile({ fullName: fullName.trim() });
      closeEdit();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveUsername = async () => {
    const validationError = validateUsername(username);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const isAvailable = await checkUsernameAvailable(username);
      if (!isAvailable) {
        setError('Username is already taken');
        setIsLoading(false);
        return;
      }

      await updateUsername(username.trim());
      closeEdit();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!newEmail || !currentPassword) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await updateEmail(newEmail.trim(), currentPassword);
      closeEdit();
      Alert.alert('Email Updated', 'Please check your new email for verification.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await updatePassword(currentPassword, newPassword);
      closeEdit();
      Alert.alert('Success', 'Password updated successfully.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      await deleteUserAccount(deletePassword);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer scrollable>
      <PageHeader title="Profile" />

      {/* Avatar */}
      <Pressable onPress={handlePickPhoto} disabled={isLoading} style={styles.avatarSection}>
        <Avatar source={userProfile?.profilePhotoUrl} name={userProfile?.fullName} size="xl" />
        <View style={[styles.editBadge, { backgroundColor: theme.colors.surface }]}>
          <FontAwesome6 name="camera" size={14} color={theme.colors.text} />
        </View>
      </Pressable>

      {/* Profile Info */}
      <View style={styles.section}>
        <ProfileRow label="Full Name" value={userProfile?.fullName || ''} onEdit={() => openEdit('fullName')} />
        <ProfileRow label="Username" value={`@${userProfile?.username || ''}`} onEdit={() => openEdit('username')} />
        <ProfileRow label="Email" value={userProfile?.email || ''} onEdit={() => openEdit('email')} />
        <ProfileRow label="Password" value="••••••••" onEdit={() => openEdit('password')} />
      </View>

      {/* Theme Selector */}
      <View style={styles.section}>
        <View style={styles.row}>
          <Text size="sm" color="subtle">
            Theme
          </Text>
          <View style={styles.themeSelector}>
            <Button
              title="LIGHT"
              variant={themeMode === 'light' ? 'primary' : 'ghost'}
              onPress={() => themeMode !== 'light' && toggleTheme()}
            />
            <Text color="muted">/</Text>
            <Button
              title="DARK"
              variant={themeMode === 'dark' ? 'primary' : 'ghost'}
              onPress={() => themeMode !== 'dark' && toggleTheme()}
            />
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Button title="LOGOUT" variant="secondary" onPress={handleLogout} loading={isLoading} fullWidth />
        <View style={styles.spacer} />
        <Button title="DELETE ACCOUNT" variant="error" onPress={() => setShowDeleteConfirm(true)} fullWidth />
      </View>

      {/* Edit Full Name Modal */}
      <Modal visible={editMode === 'fullName'} onClose={closeEdit} title="Edit Full Name">
        <TextInput label="Full Name" value={fullName} onChangeText={setFullName} maxLength={32} error={error} />
        <View style={styles.modalButtons}>
          <Button title="CANCEL" variant="ghost" onPress={closeEdit} />
          <Button title="SAVE" variant="primary" onPress={handleSaveFullName} loading={isLoading} />
        </View>
      </Modal>

      {/* Edit Username Modal */}
      <Modal visible={editMode === 'username'} onClose={closeEdit} title="Edit Username">
        <TextInput
          label="Username"
          value={username}
          onChangeText={setUsername}
          maxLength={24}
          autoCapitalize="none"
          error={error}
        />
        <Text size="xs" color="muted" style={styles.hint}>
          Letters, numbers, and underscores only
        </Text>
        <View style={styles.modalButtons}>
          <Button title="CANCEL" variant="ghost" onPress={closeEdit} />
          <Button title="SAVE" variant="primary" onPress={handleSaveUsername} loading={isLoading} />
        </View>
      </Modal>

      {/* Edit Email Modal */}
      <Modal visible={editMode === 'email'} onClose={closeEdit} title="Change Email">
        <TextInput
          label="New Email"
          value={newEmail}
          onChangeText={setNewEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          label="Current Password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          error={error}
        />
        <View style={styles.modalButtons}>
          <Button title="CANCEL" variant="ghost" onPress={closeEdit} />
          <Button title="SAVE" variant="primary" onPress={handleSaveEmail} loading={isLoading} />
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={editMode === 'password'} onClose={closeEdit} title="Change Password">
        <TextInput label="Current Password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
        <TextInput label="New Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
        <TextInput
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          error={error}
        />
        <View style={styles.modalButtons}>
          <Button title="CANCEL" variant="ghost" onPress={closeEdit} />
          <Button title="SAVE" variant="primary" onPress={handleSavePassword} loading={isLoading} />
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeletePassword('');
        }}
        title="Delete Account"
        dismissable={!isLoading}
      >
        <Text color="subtle" style={styles.deleteWarning}>
          This action cannot be undone. All your data, posts, and friendships will be permanently deleted.
        </Text>
        <TextInput
          label="Enter your password to confirm"
          value={deletePassword}
          onChangeText={setDeletePassword}
          secureTextEntry
        />
        <View style={styles.modalButtons}>
          <Button
            title="CANCEL"
            variant="ghost"
            onPress={() => {
              setShowDeleteConfirm(false);
              setDeletePassword('');
            }}
            disabled={isLoading}
          />
          <Button title="DELETE" variant="error" onPress={handleDeleteAccount} loading={isLoading} />
        </View>
      </Modal>
    </ScreenContainer>
  );
}

// Profile row component
function ProfileRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  const { theme } = useTheme();

  return (
    <Pressable style={[styles.row, { borderBottomColor: theme.colors.highlightLow }]} onPress={onEdit}>
      <View style={styles.rowContent}>
        <Text size="xs" color="muted">
          {label}
        </Text>
        <Text size="sm" weight="medium">
          {value}
        </Text>
      </View>
      <FontAwesome6 name="pen" size={14} color={theme.colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatarSection: {
    alignSelf: 'center',
    marginVertical: 24,
    position: 'relative',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  section: {
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rowContent: {
    flex: 1,
  },
  themeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spacer: {
    height: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  hint: {
    marginTop: 4,
    marginBottom: 8,
  },
  deleteWarning: {
    marginBottom: 16,
  },
});
