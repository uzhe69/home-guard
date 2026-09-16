import { Settings } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { BrandMark } from '@/components/brand-mark';
import { MotionPressable } from '@/components/ui/motion-pressable';
import { colors } from '@/constants/design';

export function AppHeader() {
  const router = useRouter();

  return (
    <View className="mb-5 flex-row items-center justify-between">
      <BrandMark compact />
      <MotionPressable
        accessibilityLabel="Open settings"
        className="h-10 w-10 items-center justify-center rounded-2xl bg-white"
        onPress={() => router.push('/settings')}>
        <Settings color={colors.primaryDark} size={21} strokeWidth={2.2} />
      </MotionPressable>
    </View>
  );
}
