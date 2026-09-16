import {
  Bell,
  ChevronRight,
  Code2,
  Flame,
  House,
  RotateCcw,
  Snowflake,
} from 'lucide-react-native';
import { type Href, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { SettingsPage } from '@/components/settings-page';
import { Card } from '@/components/ui/card';
import { MotionPressable } from '@/components/ui/motion-pressable';
import { colors } from '@/constants/design';
import { useApp } from '@/state/app-provider';

const sections = [
  { route: '/settings/home', title: 'Home & location', icon: House, tone: 'primary' },
  { route: '/settings/ac', title: 'AC monitoring', icon: Snowflake, tone: 'primary' },
  { route: '/settings/stove', title: 'Stove safety', icon: Flame, tone: 'stove' },
  { route: '/settings/alerts', title: 'Alerts & sensors', icon: Bell, tone: 'primary' },
  { route: '/settings/developer', title: 'Demo lab', icon: Code2, tone: 'developer' },
] as const;

export default function SettingsScreen() {
  const router = useRouter();
  const { firebaseMode, resetDemo, settings } = useApp();
  const summaries = [
    `${settings.homeAddress} · ${settings.radiusMeters} m`,
    `${settings.acDelayMode === 'smart' ? 'Smart delay' : `${settings.reminderDelayMinutes} min delay`} · below ${settings.temperatureThresholdCelsius}°C`,
    `${settings.kitchenInactivityMinutes} min inactivity · ${settings.stoveDepartureDelayMinutes} min away`,
    `${settings.notificationsEnabled ? 'Alerts on' : 'Alerts paused'} · 2 sensors connected`,
    `${firebaseMode} data mode`,
  ];

  return (
    <SettingsPage root subtitle="Choose an area to adjust." title="Settings">
      <Card className="p-2">
        {sections.map((section, index) => {
          const Icon = section.icon;
          const stove = section.tone === 'stove';
          const developer = section.tone === 'developer';
          const iconColor = stove ? colors.ember : developer ? '#5564B0' : colors.primary;
          const iconBackground = stove ? 'bg-warmth' : developer ? 'bg-[#EEF1FF]' : 'bg-mint';
          return (
            <MotionPressable
              accessibilityRole="button"
              className={`flex-row items-center rounded-[18px] p-3.5 ${index < sections.length - 1 ? 'mb-1' : ''}`}
              key={section.route}
              onPress={() => router.push(section.route as Href)}>
              <View className={`h-11 w-11 items-center justify-center rounded-[14px] ${iconBackground}`}>
                <Icon color={iconColor} size={21} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[15px] font-semibold text-ink">{section.title}</Text>
                <Text className="mt-0.5 text-[12px] leading-4 text-slate" numberOfLines={1}>
                  {summaries[index]}
                </Text>
              </View>
              <ChevronRight color={colors.slate} size={18} />
            </MotionPressable>
          );
        })}
      </Card>

      <Pressable
        className="mt-6 flex-row items-center justify-center gap-2 py-3"
        onPress={() =>
          Alert.alert('Reset demo?', 'This clears local settings and returns to onboarding.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reset',
              style: 'destructive',
              onPress: () => void resetDemo().then(() => router.replace('/onboarding')),
            },
          ])
        }>
        <RotateCcw color={colors.slate} size={15} />
        <Text className="text-[13px] font-medium text-slate">Reset demo experience</Text>
      </Pressable>
    </SettingsPage>
  );
}
