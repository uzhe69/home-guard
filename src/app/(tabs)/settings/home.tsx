import { ChevronRight, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { RadiusSettings } from '@/components/radius-settings';
import { SettingsLabel, SettingsPage } from '@/components/settings-page';
import { Card } from '@/components/ui/card';
import { MotionPressable } from '@/components/ui/motion-pressable';
import { colors } from '@/constants/design';
import { useApp } from '@/state/app-provider';

export default function HomeSettingsScreen() {
  const router = useRouter();
  const { patchSettings, settings } = useApp();

  return (
    <SettingsPage subtitle="Set where Home Guard considers you at home." title="Home & location">
      <SettingsLabel>Home address</SettingsLabel>
      <MotionPressable onPress={() => router.push('/onboarding/location')}>
        <Card className="flex-row items-center p-4">
          <View className="h-12 w-12 items-center justify-center rounded-[15px] bg-mint">
            <MapPin color={colors.primary} size={22} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-[15px] font-semibold text-ink">{settings.homeAddress}</Text>
            <Text className="mt-1 text-[12px] text-slate">Tap to update your map pin</Text>
          </View>
          <ChevronRight color={colors.slate} size={19} />
        </Card>
      </MotionPressable>

      <View className="mt-6">
        <SettingsLabel>Geofence radius</SettingsLabel>
        <RadiusSettings
          onChange={(radiusMeters) => patchSettings({ radiusMeters })}
          value={settings.radiusMeters}
        />
      </View>
    </SettingsPage>
  );
}
