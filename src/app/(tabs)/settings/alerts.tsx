import { Bell, Flame, Radio, Thermometer } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { SettingsLabel, SettingsPage } from '@/components/settings-page';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { colors } from '@/constants/design';
import { useApp } from '@/state/app-provider';

export default function AlertsSettingsScreen() {
  const { patchSettings, settings } = useApp();

  return (
    <SettingsPage subtitle="Manage notifications and review connected sensors." title="Alerts & sensors">
      <SettingsLabel>Guard behavior</SettingsLabel>
      <Card className="gap-3 p-3">
        <View className="flex-row items-center rounded-[17px] bg-[#F5F8F6] p-4">
          <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-mint">
            <Bell color={colors.primary} size={21} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-[15px] font-semibold text-ink">Appliance alerts</Text>
            <Text className="mt-0.5 text-[12px] text-slate">Stove safety and AC reminders</Text>
          </View>
          <Switch
            onValueChange={(notificationsEnabled) => void patchSettings({ notificationsEnabled })}
            value={settings.notificationsEnabled}
          />
        </View>
        <View className="flex-row items-center rounded-[17px] bg-[#F5F8F6] p-4">
          <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-mint">
            <Thermometer color={colors.primary} size={21} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-[15px] font-semibold text-ink">Temperature check</Text>
            <Text className="mt-0.5 text-[12px] text-slate">
              Below {settings.temperatureThresholdCelsius}°C
            </Text>
          </View>
          <View className="rounded-full bg-mint px-3 py-1.5">
            <Text className="text-[12px] font-semibold text-primary">Active</Text>
          </View>
        </View>
      </Card>

      <View className="mt-7">
        <SettingsLabel>Connected devices</SettingsLabel>
        <View className="gap-3">
          <Card className="flex-row items-center p-4">
            <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-mint">
              <Radio color={colors.primary} size={21} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[14px] font-semibold text-ink">Bedroom AC sensor</Text>
              <Text className="mt-0.5 text-[12px] text-primary">
                Connected · {settings.acDeviceId}
              </Text>
            </View>
          </Card>
          <Card className="flex-row items-center border-warmLine p-4">
            <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-warmth">
              <Flame color={colors.ember} size={21} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[14px] font-semibold text-ink">Kitchen stove + motion</Text>
              <Text className="mt-0.5 text-[12px] text-ember">
                Connected · {settings.stoveDeviceId}
              </Text>
            </View>
          </Card>
        </View>
      </View>
    </SettingsPage>
  );
}
