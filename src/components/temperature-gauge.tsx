import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '@/constants/design';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 220;
const STROKE = 11;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function TemperatureGauge({ temperature }: { temperature: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.min(Math.max((temperature - 16) / 14, 0.08), 0.95), {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, temperature]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <View style={styles.container}>
      <Svg height={SIZE} width={SIZE} style={styles.svg}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          fill="none"
          r={RADIUS}
          stroke={colors.mint}
          strokeWidth={STROKE}
        />
        <AnimatedCircle
          animatedProps={animatedProps}
          cx={SIZE / 2}
          cy={SIZE / 2}
          fill="none"
          r={RADIUS}
          stroke={colors.primary}
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeLinecap="round"
          strokeWidth={STROKE}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <View className="absolute items-center">
        <View className="flex-row items-start">
          <Text className="text-[50px] font-bold tracking-[-2.5px] text-ink">
            {temperature.toFixed(1)}
          </Text>
          <Text className="mt-1 text-[24px] font-semibold text-ink">°</Text>
        </View>
        <Text className="mt-1 text-[14px] font-medium text-slate">Room temperature</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'center',
    height: SIZE,
    justifyContent: 'center',
    width: SIZE,
  },
  svg: {
    transform: [{ rotateZ: '0deg' }],
  },
});
