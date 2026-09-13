import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { OnboardingIllustration } from '@/components/onboarding-illustration';
import { Button } from '@/components/ui/button';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-canvas px-6 pb-3">
      <Animated.View entering={FadeInUp.duration(600)} className="items-center pt-8">
        <BrandMark />
      </Animated.View>
      <View className="flex-1 justify-center">
        <Animated.View entering={FadeInDown.delay(100).duration(650)}>
          <Text className="text-center text-[38px] font-bold leading-[43px] tracking-[-1.5px] text-ink">
            Never wonder if you left the AC on.
          </Text>
          <Text className="mx-3 mt-4 text-center text-[17px] leading-6 text-slate">
            AC Guard watches your home when you step away—and lets you switch it off from anywhere.
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(220).duration(700)} className="mt-8">
          <OnboardingIllustration />
        </Animated.View>
      </View>
      <Animated.View entering={FadeInDown.delay(360).duration(600)} className="gap-2">
        <Button label="Set up my home" onPress={() => router.push('/onboarding/location')} />
        <Button label="Explore the demo" onPress={() => router.replace('/dashboard')} variant="ghost" />
      </Animated.View>
    </SafeAreaView>
  );
}
