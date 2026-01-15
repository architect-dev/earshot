import { Tabs } from 'expo-router';
import { View, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/ui';

function ProfileTabIcon({ focused }: { focused: boolean }) {
  const { theme } = useTheme();
  const { userProfile } = useAuth();

  return (
    <View style={[styles.avatarContainer, focused && { borderColor: theme.colors.gold, borderWidth: 2 }]}>
      <Avatar
        source={userProfile?.profilePhotoUrl}
        name={userProfile?.fullName}
        size="sm"
        style={styles.avatar}
        online
      />
    </View>
  );
}

function TextTabIcon({ icon, color }: { icon: string; color: string }) {
  return <Text style={{ fontSize: 18, fontWeight: 'bold', color }}>{icon}</Text>;
}

export default function TabsLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.highlightMed,
          borderTopWidth: 1,
          height: 50 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.gold,
        tabBarInactiveTintColor: theme.colors.muted,
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: 'PROFILE',
          tabBarIcon: ({ focused }) => <ProfileTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'CREATE',
          tabBarIcon: ({ color }) => <TextTabIcon icon="))" color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'FEED',
          tabBarIcon: ({ color }) => <TextTabIcon icon="((" color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages/index"
        options={{
          title: 'MESSAGES',
          tabBarIcon: ({ color }) => <TextTabIcon icon=")(" color={color} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'FRIENDS',
          tabBarIcon: ({ color }) => <FontAwesome5 name="user" size={16} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    borderRadius: 0,
  },
  avatar: {
    width: 24,
    height: 24,
  },
});
