import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard,
  Swords,
  ScrollText,
  BrainCircuit,
  Bitcoin,
  Settings2,
  LucideIcon,
} from 'lucide-react-native';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useLogsStore } from '../store/logsStore';

interface TabIconProps {
  Icon: LucideIcon;
  focused: boolean;
  color: string;
  showUnreadDot?: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ Icon, focused, color, showUnreadDot }) => {
  const unreadCount = useLogsStore(s => s.unreadCount);

  return (
    <View style={styles.iconContainer}>
      {focused && <View style={styles.topIndicator} />}
      <View style={styles.iconWrapper}>
        <Icon color={color} strokeWidth={focused ? 2.5 : 1.8} size={22} />
        {showUnreadDot && unreadCount > 0 && <View style={styles.unreadDot} />}
      </View>
    </View>
  );
};

export default function RootLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 14);
  const loadLogs = useLogsStore(s => s.loadLogs);

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <>
      <AnimatedSplashOverlay />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false, // Icon-only bottom navbar
          tabBarActiveTintColor: '#FF9900',
          tabBarInactiveTintColor: '#484F58',
          tabBarItemStyle: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          },
          tabBarStyle: {
            backgroundColor: '#161719',
            borderTopColor: '#2D3035',
            height: 54 + bottomPadding,
            paddingBottom: bottomPadding,
            paddingTop: 4,
            elevation: 8,
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            alignItems: 'center',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Control',
            tabBarAccessibilityLabel: 'Home — Mission Control',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon Icon={LayoutDashboard} focused={focused} color={color as string} />
            ),
          }}
        />

        <Tabs.Screen
          name="bot_arena"
          options={{
            title: 'Bot Arena',
            tabBarAccessibilityLabel: 'Bot Arena',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon Icon={Swords} focused={focused} color={color as string} />
            ),
          }}
        />

        <Tabs.Screen
          name="logs"
          options={{
            title: 'Logs',
            tabBarAccessibilityLabel: 'Logs Feed',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon Icon={ScrollText} focused={focused} color={color as string} showUnreadDot />
            ),
          }}
        />

        <Tabs.Screen
          name="intelligence"
          options={{
            title: 'Intel',
            tabBarAccessibilityLabel: 'Market Intelligence',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon Icon={BrainCircuit} focused={focused} color={color as string} />
            ),
          }}
        />

        <Tabs.Screen
          name="btc_stack"
          options={{
            title: 'BTC Stack',
            tabBarAccessibilityLabel: 'BTC Compounding Stack',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon Icon={Bitcoin} focused={focused} color={color as string} />
            ),
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarAccessibilityLabel: 'System Settings',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon Icon={Settings2} focused={focused} color={color as string} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  topIndicator: {
    position: 'absolute',
    top: 0,
    height: 2,
    width: 20,
    backgroundColor: '#FF9900',
    borderRadius: 1,
  },
  iconWrapper: {
    position: 'relative',
    marginTop: 4,
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F85149',
  },
});
