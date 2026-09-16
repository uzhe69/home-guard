import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { MotionPressable } from '@/components/ui/motion-pressable';
import { colors } from '@/constants/design';
import { useScreenEntrance } from '@/lib/motion';

export function SettingsPage({
  title,
  subtitle,
  children,
  root = false,
}: React.PropsWithChildren<{ title: string; subtitle: string; root?: boolean }>) {
  const router = useRouter();
  const screenStyle = useScreenEntrance();

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }}
        style={screenStyle}
        showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(420)}>
          {root ? (
            <AppHeader />
          ) : (
            <View className="mb-6 flex-row items-center">
              <MotionPressable
                accessibilityLabel="Back to settings"
                className="h-10 w-10 items-center justify-center rounded-2xl bg-white"
                onPress={() => router.back()}>
                <ArrowLeft color={colors.primaryDark} size={21} strokeWidth={2.2} />
              </MotionPressable>
              <Text className="ml-3 text-[14px] font-semibold text-primary">Settings</Text>
            </View>
          )}
          <Text className="text-[36px] font-bold tracking-[-1.5px] text-ink">{title}</Text>
          <Text className="mt-1 text-[16px] leading-6 text-slate">{subtitle}</Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(80).duration(520)} className="mt-7">
          {children}
        </Animated.View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

export function SettingsLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2 ml-1 text-[12px] font-semibold uppercase tracking-[1.3px] text-slate">
      {children}
    </Text>
  );
}
