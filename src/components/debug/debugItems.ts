import { Alert } from 'react-native';
import { type DebugMenuItem } from './DebugMenu';
import { SEED_USERS, createSeedUsers, switchToSeedUser } from '@/services/debug';

// Helper to show an alert
const showAlert = (title: string, message?: string) => {
  Alert.alert(title, message);
};

interface GetDebugItemsOptions {
  openConfirmModal?: (() => void) | null;
}

// Default debug items
export const getDefaultDebugItems = (options?: GetDebugItemsOptions): DebugMenuItem[] => [
  {
    type: 'folder',
    label: 'Switch User',
    items: [
      {
        type: 'action',
        label: 'Create All Seed Users',
        onPress: async () => {
          try {
            const result = await createSeedUsers();
            const message = [
              result.created.length > 0 ? `Created: ${result.created.join(', ')}` : null,
              result.skipped.length > 0 ? `Skipped: ${result.skipped.join(', ')}` : null,
              result.errors.length > 0 ? `Errors: ${result.errors.join(', ')}` : null,
            ]
              .filter(Boolean)
              .join('\n\n');
            showAlert('Seed Users', message || 'No changes made');
          } catch (err) {
            showAlert('Error', String(err));
          }
        },
      },
      // Generate switch actions for each seed user
      ...SEED_USERS.map((user) => ({
        type: 'action' as const,
        label: `→ ${user.fullName} (@${user.username})`,
        onPress: async () => {
          try {
            await switchToSeedUser(user.email);
            showAlert('Switched', `Now signed in as ${user.fullName}`);
          } catch (err) {
            const error = err as { code?: string };
            if (error.code === 'auth/user-not-found') {
              showAlert('User Not Found', 'Run "Create All Seed Users" first');
            } else {
              showAlert('Error', String(err));
            }
          }
        },
      })),
    ],
  },
  {
    type: 'folder',
    label: 'Authentication',
    items: [
      {
        type: 'action',
        label: 'Log Current User',
        onPress: () => {
          showAlert('Auth Debug', 'Check console for user info');
          // eslint-disable-next-line no-console
          console.log('[DEBUG] Current user logging not yet implemented');
        },
      },
      {
        type: 'action',
        label: 'Force Logout',
        onPress: () => {
          showAlert('Force Logout', 'Not yet implemented');
        },
      },
      {
        type: 'action',
        label: 'Simulate Email Verified',
        onPress: () => {
          showAlert('Simulate Email Verified', 'Not yet implemented');
        },
      },
    ],
  },
  {
    type: 'folder',
    label: 'Notifications',
    items: [
      {
        type: 'action',
        label: 'Trigger Success Notification',
        onPress: () => {
          showAlert('Success!', 'This would trigger a success notification');
        },
      },
      {
        type: 'action',
        label: 'Trigger Error Notification',
        onPress: () => {
          showAlert('Error', 'This would trigger an error notification');
        },
      },
      {
        type: 'action',
        label: 'Trigger Friend Request',
        onPress: () => {
          showAlert('Friend Request', 'You have a new friend request from @debuguser');
        },
      },
      {
        type: 'action',
        label: 'Trigger New Message',
        onPress: () => {
          showAlert('New Message', 'Debug User: Hey there!');
        },
      },
    ],
  },
  {
    type: 'folder',
    label: 'Theme',
    items: [
      {
        type: 'action',
        label: 'Toggle Theme',
        onPress: () => {
          showAlert('Toggle Theme', 'Use the theme context toggle instead');
        },
      },
      {
        type: 'action',
        label: 'Log Theme Colors',
        onPress: () => {
          // eslint-disable-next-line no-console
          console.log('[DEBUG] Theme colors logging not yet implemented');
          showAlert('Theme Debug', 'Check console for theme colors');
        },
      },
    ],
  },
  {
    type: 'folder',
    label: 'Data',
    items: [
      {
        type: 'action',
        label: 'Generate Test Posts',
        onPress: () => {
          showAlert('Generate Posts', 'Not yet implemented');
        },
      },
      {
        type: 'action',
        label: 'Clear Local Cache',
        onPress: () => {
          showAlert('Clear Cache', 'Not yet implemented');
        },
      },
      {
        type: 'action',
        label: 'Log Firestore Queries',
        onPress: () => {
          showAlert('Firestore Logging', 'Not yet implemented');
        },
      },
    ],
  },
  {
    type: 'folder',
    label: 'UI Components',
    items: [
      {
        type: 'action',
        label: 'Open Confirm Modal',
        onPress: () => {
          if (options?.openConfirmModal) {
            options.openConfirmModal();
          } else {
            showAlert('Confirm Modal', 'Modal opener not set');
          }
        },
      },
    ],
  },
  {
    type: 'action',
    label: 'Show Environment Info',
    onPress: () => {
      showAlert('Environment', `__DEV__: ${__DEV__}\nPlatform: React Native\nBundle: Development`);
    },
  },
];
