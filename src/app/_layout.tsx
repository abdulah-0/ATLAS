import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedSplashOverlay } from '@/components/animated-icon';

export default function RootLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 16);

  return (
    <>
      <AnimatedSplashOverlay />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#FF9900',
          tabBarInactiveTintColor: '#8E8E93',
          tabBarStyle: {
            backgroundColor: '#161719',
            borderTopColor: '#2D3035',
            height: 56 + bottomPadding,
            paddingBottom: bottomPadding,
            paddingTop: 6,
            elevation: 8,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Control',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" size={size || 22} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="bot_arena"
          options={{
            title: 'Bot Arena',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="hardware-chip-outline" size={size || 22} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="trade_feed"
          options={{
            title: 'Trade Feed',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="receipt-outline" size={size || 22} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="intelligence"
          options={{
            title: 'Intel',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="analytics-outline" size={size || 22} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="btc_stack"
          options={{
            title: 'BTC Stack',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="logo-bitcoin" size={size || 22} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size || 22} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
