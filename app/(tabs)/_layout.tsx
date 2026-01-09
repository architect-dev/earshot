import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5, FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/ui';

function ProfileTabIcon({ focused }: { focused: boolean }) {
  const { theme } = useTheme();
  const { userProfile } = useAuth();

  return (
    <View style={[styles.avatarContainer, focused && { borderColor: theme.colors.gold, borderWidth: 2 }]}>
      <Avatar source={userProfile?.profilePhotoUrl} name={userProfile?.fullName} size="sm" style={styles.avatar} />
    </View>
  );
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
          tabBarIcon: ({ color }) => <FontAwesome6 name="plus" size={18} color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'FEED',
          tabBarIcon: ({ color }) => <FontAwesome6 name="bars" size={18} color={color} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'FRIENDS',
          tabBarIcon: ({ color }) => <FontAwesome5 name="user" size={16} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages/index"
        options={{
          title: 'MESSAGES',
          tabBarIcon: ({ color }) => <FontAwesome6 name="message" size={18} color={color} />,
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
