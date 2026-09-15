import { Bell, ChevronRight, Code2, Home, MapPin, Radio, RotateCcw, Thermometer } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AcSettings } from '@/components/ac-settings';
import { RadiusSettings } from '@/components/radius-settings';
import { DurationInput } from '@/components/duration-input';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Switch } from '@/components/ui/switch';
import { colors } from '@/constants/design';
import { useApp } from '@/state/app-provider';

function Label({ children }: { children: string }) {
  return <Text className="mb-2 ml-1 text-[12px] font-semibold uppercase tracking-[1.3px] text-slate">{children}</Text>;
}

export default function SettingsScreen() {
  const router = useRouter();
  const {
    settings,
    firebaseMode,
    patchSettings,
    simulateLeaving,
    simulateTemperature,
    sendTestReminder,
    resetDemo,
  } = useApp();
  const [customInactivity, setCustomInactivity] = useState(false);
  const showCustomInactivity = customInactivity || ![30, 60, 90].includes(settings.kitchenInactivityMinutes);
  const [working, setWorking] = useState<string | null>(null);

  async function run(label: string, action: () => Promise<void>) {
    setWorking(label);
    await action();
    setWorking(null);
  }

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(500)}>
          <AppHeader />
          <Text className="text-[36px] font-bold tracking-[-1.5px] text-ink">Settings</Text>
          <Text className="mt-1 text-[16px] text-slate">Tune your guard to fit your home.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(600)} className="mt-7">
          <Label>Home</Label>
          <Pressable onPress={() => router.push('/onboarding/location')}>
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
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).duration(600)} className="mt-5">
          <Label>Geofence radius</Label>
          <RadiusSettings value={settings.radiusMeters} onChange={(radiusMeters) => patchSettings({ radiusMeters })} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(600)} className="mt-5">
          <AcSettings />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(230).duration(600)} className="mt-5">
          <Label>Stove motion inactivity</Label>
          <SegmentedControl<number | string>
            onChange={(duration) => {
              setCustomInactivity(duration === 'custom');
              if (typeof duration === 'number') void patchSettings({ kitchenInactivityMinutes: duration });
            }}
            segments={[
              { label: '30 min', value: 30 },
              { label: '60 min', value: 60 },
              { label: '90 min', value: 90 },
              { label: 'Custom', value: 'custom' },
            ]}
            value={showCustomInactivity ? 'custom' : settings.kitchenInactivityMinutes}
          />
          <Text className="mt-2 text-[12px] leading-5 text-slate">Alert only while the infrared sensor detects heat and no motion is detected for {settings.kitchenInactivityMinutes} minutes.</Text>
          {showCustomInactivity && (
            <View className="mt-3">
              <DurationInput label="Custom inactivity duration in minutes" value={settings.kitchenInactivityMinutes} submitLabel="Save duration" onSave={(kitchenInactivityMinutes) => patchSettings({ kitchenInactivityMinutes })} />
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250).duration(600)} className="mt-5">
          <Label>Stove departure alert delay</Label>
          <SegmentedControl<2 | 3 | 5>
            onChange={(stoveDepartureDelayMinutes) => void patchSettings({ stoveDepartureDelayMinutes })}
            segments={[
              { label: '2 min', value: 2 },
              { label: '3 min', value: 3 },
              { label: '5 min', value: 5 },
            ]}
            value={settings.stoveDepartureDelayMinutes}
          />
          <Text className="mt-2 text-[12px] leading-5 text-slate">High-priority warning when your phone leaves the home radius while the stove is hot. Cooking timers do not delay this warning.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).duration(600)} className="mt-5">
          <Label>Guard behavior</Label>
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
                <Text className="mt-0.5 text-[12px] text-slate">Below {settings.temperatureThresholdCelsius}°C</Text>
              </View>
              <View className="rounded-full bg-mint px-3 py-1.5"><Text className="text-[12px] font-semibold text-primary">Active</Text></View>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(320).duration(600)} className="mt-7">
          <View className="mb-2 flex-row items-center justify-between px-1">
            <Label>Developer demo controls</Label>
            <View className="mb-2 rounded-full bg-mint px-2.5 py-1">
              <Text className="text-[10px] font-bold uppercase tracking-[0.8px] text-primary">{firebaseMode}</Text>
            </View>
          </View>
          <Card className="p-4">
            <View className="mb-4 flex-row items-start">
              <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-[#EEF1FF]">
                <Code2 color="#5564B0" size={21} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[15px] font-semibold text-ink">Demo lab</Text>
                <Text className="mt-1 text-[12px] leading-4 text-slate">Exercise the full flow without walking outside or connecting hardware.</Text>
              </View>
            </View>
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
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(380).duration(600)} className="mt-5">
          <Card className="flex-row items-center p-4">
            <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-mint">
              <Radio color={colors.primary} size={21} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[14px] font-semibold text-ink">Bedroom AC sensor</Text>
              <Text className="mt-0.5 text-[12px] text-primary">Connected • device-bedroom</Text>
            </View>
          </Card>
        </Animated.View>

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
      </ScrollView>
    </SafeAreaView>
  );
}
