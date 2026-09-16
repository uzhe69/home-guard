import { useRouter } from 'expo-router';
import { Check, ChevronLeft, Flame, Radio, ScanLine } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { colors } from '@/constants/design';
import { useApp } from '@/state/app-provider';

const inactivityOptions = [30, 60, 90] as const;

function CalibrationRow({ children }: React.PropsWithChildren) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-7 w-7 items-center justify-center rounded-full bg-warmth">
        <Check color={colors.ember} size={15} strokeWidth={3} />
      </View>
      <Text className="flex-1 text-[13px] font-medium text-ink">{children}</Text>
    </View>
  );
}

export default function StoveSetupScreen() {
  const router = useRouter();
  const { patchSettings, settings } = useApp();
  const initialInactivity = inactivityOptions.includes(
    settings.kitchenInactivityMinutes as (typeof inactivityOptions)[number],
  )
    ? settings.kitchenInactivityMinutes
    : 60;
  const [inactivityMinutes, setInactivityMinutes] = useState(initialInactivity);
  const [departureDelayMinutes, setDepartureDelayMinutes] = useState(settings.stoveDepartureDelayMinutes);
  const [saving, setSaving] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <View className="flex-row items-center py-2">
          <Pressable className="h-11 w-11 items-center justify-center rounded-2xl bg-white" onPress={() => router.back()}>
            <ChevronLeft color={colors.primaryDark} size={25} />
          </Pressable>
          <Text className="ml-3 text-[14px] font-semibold uppercase tracking-[1.5px] text-ember">Stove setup</Text>
        </View>

        <Animated.View entering={FadeInDown.duration(550)} className="pt-4">
          <Text className="text-[34px] font-bold tracking-[-1.2px] text-ink">Set up your stove sensor</Text>
          <Text className="mt-2 text-[16px] leading-6 text-slate">
            Confirm the demo sensor, then choose when heat and inactivity should trigger a warning.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(600)} className="mt-6">
          <Card className="p-4">
            <View className="flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-[15px] bg-warmth">
                <Radio color={colors.ember} size={23} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[16px] font-semibold text-ink">Kitchen stove sensor</Text>
                <Text className="mt-0.5 text-[12px] text-slate">Infrared heat + kitchen motion</Text>
              </View>
              <View className="rounded-full bg-warmth px-3 py-1.5">
                <Text className="text-[11px] font-bold text-ember">Connected</Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(170).duration(600)} className="mt-5">
          <Card className="gap-3 p-4">
            <View className="flex-row items-center gap-2">
              <ScanLine color={colors.ember} size={19} />
              <Text className="text-[15px] font-semibold text-ink">Demo calibration ready</Text>
            </View>
            <CalibrationRow>Sensor paired with this home</CalibrationRow>
            <CalibrationRow>Cool-stove baseline recorded</CalibrationRow>
            <CalibrationRow>Kitchen motion zone detected</CalibrationRow>
            <Text className="text-[12px] leading-5 text-slate">
              For a physical install, run this check with every burner off and the sensor facing the cooking surface.
            </Text>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).duration(600)} className="mt-6 gap-5">
          <View>
            <Text className="mb-2 text-[14px] font-semibold text-ink">Warn after no kitchen motion</Text>
            <SegmentedControl<number>
              onChange={setInactivityMinutes}
              segments={inactivityOptions.map((minutes) => ({ label: `${minutes} min`, value: minutes }))}
              value={inactivityMinutes}
            />
            <Text className="mt-2 text-[12px] leading-5 text-slate">
              Only applies while the infrared sensor still detects stove heat.
            </Text>
          </View>

          <View>
            <Text className="mb-2 text-[14px] font-semibold text-ink">Warn after you leave home</Text>
            <SegmentedControl<2 | 3 | 5>
              onChange={setDepartureDelayMinutes}
              segments={[
                { label: '2 min', value: 2 },
                { label: '3 min', value: 3 },
                { label: '5 min', value: 5 },
              ]}
              value={departureDelayMinutes}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(310).duration(600)} className="mt-7 pb-3">
          <Button
            label="Continue to reminders"
            left={<Flame color="white" size={19} />}
            loading={saving}
            onPress={async () => {
              setSaving(true);
              await patchSettings({
                kitchenInactivityMinutes: inactivityMinutes,
                stoveDepartureDelayMinutes: departureDelayMinutes,
              });
              setSaving(false);
              router.push('/onboarding/reminder');
            }}
            variant="stove"
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
