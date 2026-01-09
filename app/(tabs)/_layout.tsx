import { Tabs } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { Text } from '@/components/ui';

export default function TabsLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.highlightMed,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.gold,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'FEED',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>◉</Text>,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'CREATE',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>+</Text>,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'MESSAGES',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>✉</Text>,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'FRIENDS',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>◎</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'PROFILE',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>●</Text>,
        }}
      />
    </Tabs>
  );
}
