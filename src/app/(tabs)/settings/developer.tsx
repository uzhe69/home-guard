import { Bell, Code2, Flame, Home } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { SettingsPage } from '@/components/settings-page';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { colors } from '@/constants/design';
import { useApp } from '@/state/app-provider';

export default function DeveloperSettingsScreen() {
  const {
    firebaseMode,
    sendTestReminder,
    sendTestStoveReminder,
    simulateLeaving,
    simulateStove,
    simulateTemperature,
  } = useApp();
  const [working, setWorking] = useState<string | null>(null);

  async function run(label: string, action: () => Promise<void>) {
    setWorking(label);
    await action();
    setWorking(null);
  }

  return (
    <SettingsPage subtitle="Exercise flows without walking outside or connecting hardware." title="Demo lab">
      <View className="mb-3 flex-row items-center justify-between px-1">
        <View className="flex-row items-center gap-2">
          <Code2 color="#5564B0" size={18} />
          <Text className="text-[13px] font-semibold text-ink">Simulation controls</Text>
        </View>
        <View className="rounded-full bg-mint px-2.5 py-1">
          <Text className="text-[10px] font-bold uppercase tracking-[0.8px] text-primary">
            {firebaseMode}
          </Text>
        </View>
      </View>
      <Card className="p-4">
        <Button
          className="h-12"
          label="Simulate leaving home"
          left={<Home color="white" size={18} />}
          loading={working === 'leave'}
          onPress={() => void run('leave', simulateLeaving)}
        />
        <View className="mt-3 flex-row gap-2">
          {[19.8, 22.4, 27.2].map((temperature) => (
            <Pressable
              className="flex-1 items-center rounded-[14px] bg-mintSoft py-3"
              key={temperature}
              onPress={() => void run(String(temperature), () => simulateTemperature(temperature))}>
              <Text className="text-[14px] font-bold text-primary">{temperature}°</Text>
              <Text className="mt-0.5 text-[10px] text-slate">mock room</Text>
            </Pressable>
          ))}
        </View>
        <View className="mt-3">
          <Button
            className="h-12"
            label="Send AC alert now"
            left={<Bell color={colors.primary} size={18} />}
            loading={working === 'notify'}
            onPress={() => void run('notify', sendTestReminder)}
            variant="secondary"
          />
        </View>

        <View className="mt-5 border-t border-line pt-4">
          <View className="mb-3 flex-row items-center gap-2">
            <Flame color={colors.ember} size={17} />
            <Text className="text-[13px] font-semibold text-ink">Stove scenarios</Text>
          </View>
          <View className="flex-row gap-2">
            {[
              { label: 'Active', value: 'active' as const },
              { label: 'No motion', value: 'inactive' as const },
              { label: 'Off', value: 'off' as const },
            ].map((scenario) => (
              <Pressable
                className="flex-1 items-center rounded-[14px] bg-warmthSoft py-3"
                key={scenario.value}
                onPress={() =>
                  void run(`stove-${scenario.value}`, () => simulateStove(scenario.value))
                }>
                <Text className="text-[12px] font-bold text-ember">{scenario.label}</Text>
              </Pressable>
            ))}
          </View>
          <View className="mt-3">
            <Button
              className="h-12"
              label="Send stove alert now"
              left={<Bell color={colors.ember} size={18} />}
              loading={working === 'stove-notify'}
              onPress={() => void run('stove-notify', sendTestStoveReminder)}
              variant="stoveSecondary"
            />
          </View>
        </View>
      </Card>
    </SettingsPage>
  );
}
