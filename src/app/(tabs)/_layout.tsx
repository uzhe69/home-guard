import { Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { ChartNoAxesCombined, House, Settings } from 'lucide-react-native';
import React from 'react';
import { Platform, View } from 'react-native';

import { colors } from '@/constants/design';

function TabIcon({
  name,
  fallback,
  focused,
}: {
  name: SymbolViewProps['name'];
  fallback: React.ReactNode;
  focused: boolean;
}) {
  return (
    <View className={focused ? 'h-9 w-14 items-center justify-center rounded-2xl bg-mint' : 'h-9 w-14 items-center justify-center'}>
      {Platform.OS === 'ios' ? (
        <SymbolView
          animationSpec={focused ? { effect: { type: 'bounce' }, speed: 1.2 } : undefined}
          name={name}
          size={21}
          tintColor={focused ? colors.primary : colors.slate}
          weight={focused ? 'semibold' : 'regular'}
        />
      ) : (
        fallback
      )}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.slate,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarStyle: {
          backgroundColor: '#FFFFFFF2',
          borderTopColor: colors.line,
          height: 88,
          paddingBottom: 20,
          paddingTop: 8,
        },
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon fallback={<House color={focused ? colors.primary : colors.slate} size={21} />} focused={focused} name={focused ? 'house.fill' : 'house'} />
          ),
        }}
      />
      <Tabs.Screen
        name="impact"
        options={{
          title: 'Impact',
          tabBarIcon: ({ focused }) => (
            <TabIcon fallback={<ChartNoAxesCombined color={focused ? colors.primary : colors.slate} size={21} />} focused={focused} name={focused ? 'chart.xyaxis.line' : 'chart.line.uptrend.xyaxis'} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <TabIcon fallback={<Settings color={focused ? colors.primary : colors.slate} size={21} />} focused={focused} name={focused ? 'gearshape.fill' : 'gearshape'} />
          ),
        }}
      />
    </Tabs>
  );
}
