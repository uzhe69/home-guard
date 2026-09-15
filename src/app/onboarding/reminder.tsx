import { useRouter } from 'expo-router';
import { Bell, ChevronLeft, Radio } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AcSettings } from '@/components/ac-settings';
import { Switch } from '@/components/ui/switch';
import { colors } from '@/constants/design';
import { useApp } from '@/state/app-provider';

function SettingRow({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center rounded-[17px] bg-[#F5F8F6] p-4">
      <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-mint">{icon}</View>
      <Text className="ml-3 flex-1 text-[15px] font-semibold leading-5 text-ink">{title}</Text>
      {children}
    </View>
  );
}

export default function ReminderSetupScreen() {
  const router = useRouter();
  const { settings, finishSetup } = useApp();
  const [notifications, setNotifications] = useState(settings.notificationsEnabled);
  const [saving, setSaving] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <View className="flex-row items-center py-2">
          <Pressable className="h-11 w-11 items-center justify-center rounded-2xl bg-white" onPress={() => router.back()}>
            <ChevronLeft color={colors.primaryDark} size={25} />
          </Pressable>
          <Text className="ml-3 text-[14px] font-semibold uppercase tracking-[1.5px] text-primary">Smart reminder</Text>
        </View>
        <Animated.View entering={FadeInDown.duration(550)} className="pt-4">
          <Text className="text-[34px] font-bold tracking-[-1.2px] text-ink">When should we check?</Text>
          <Text className="mt-2 text-[16px] leading-6 text-slate">
            After you leave, we’ll check your room and notify you if the AC may still be on.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(600)} className="mt-6">
          <AcSettings />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(600)} className="mt-6">
          <Card className="gap-3 p-3">
            <SettingRow icon={<Bell color={colors.primary} size={22} />} title="One reminder per departure">
              <Switch onValueChange={setNotifications} value={notifications} />
            </SettingRow>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).duration(600)} className="mt-6">
          <Text className="mb-2 text-[14px] font-semibold text-ink">Your device</Text>
          <Card className="flex-row items-center p-4">
            <View className="h-12 w-12 items-center justify-center rounded-[15px] bg-mint">
              <Radio color={colors.primary} size={23} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[16px] font-semibold text-ink">Bedroom AC sensor</Text>
              <View className="mt-1 flex-row items-center gap-1.5">
                <View className="h-2 w-2 rounded-full bg-fresh" />
                <Text className="text-[13px] font-medium text-primary">Demo device connected</Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        <View className="mt-6 pb-3">
          <Button
            label="Finish setup"
            loading={saving}
            onPress={async () => {
              setSaving(true);
              await finishSetup({
                notificationsEnabled: notifications,
              });
              setSaving(false);
              router.replace('/dashboard');
            }}
          />
          <Text className="mt-3 text-center text-[12px] leading-4 text-slate">
            iOS will ask for Always Location and notification access so Home Guard can work while closed.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
