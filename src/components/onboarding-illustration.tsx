import { House, MapPin, Wind } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/constants/design';

export function OnboardingIllustration() {
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [drift]);

  const pinStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 * drift.value }, { rotateZ: `${3 - drift.value * 6}deg` }],
  }));
  const windStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + drift.value * 0.55,
    transform: [{ translateX: drift.value * 8 }],
  }));

  return (
    <View className="h-[280px] items-center justify-end overflow-hidden rounded-[30px] bg-mintSoft">
      <View className="absolute bottom-5 h-[230px] w-[230px] rounded-full bg-mint" />
      <View className="absolute bottom-8 h-[180px] w-[180px] rounded-full border border-[#BCE9D4]" />
      <View className="mb-12 h-[112px] w-[132px] items-center justify-center rounded-[30px] border-[3px] border-primary bg-white">
        <House color={colors.primaryDark} size={62} strokeWidth={1.8} />
        <View className="absolute bottom-5 rounded-lg bg-mint px-4 py-1">
          <View className="h-1.5 w-8 rounded-full bg-fresh" />
        </View>
      </View>
      <Animated.View className="absolute right-[72px] top-8" style={pinStyle}>
        <MapPin color={colors.primary} fill={colors.fresh} size={47} strokeWidth={2} />
      </Animated.View>
      <Animated.View className="absolute bottom-[76px] right-[43px]" style={windStyle}>
        <Wind color={colors.fresh} size={44} strokeWidth={1.8} />
      </Animated.View>
    </View>
  );
}
