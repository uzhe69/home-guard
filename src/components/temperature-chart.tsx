import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors } from '@/constants/design';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const WIDTH = 330;
const HEIGHT = 118;
const PATH_LENGTH = 700;

function pointsToPath(values: number[], width: number, height: number) {
  const min = Math.min(...values) - 0.8;
  const max = Math.max(...values) + 0.8;
  const points = values.map((value, index) => ({
    x: (index / (values.length - 1)) * width,
    y: height - ((value - min) / (max - min)) * height,
  }));

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const midX = (previous.x + point.x) / 2;
    return `${path} C ${midX} ${previous.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
  }, '');
}

export function TemperatureChart({ values }: { values: number[] }) {
  const draw = useSharedValue(0);
  const linePath = pointsToPath(values, WIDTH, HEIGHT - 12);
  const areaPath = `${linePath} L ${WIDTH} ${HEIGHT} L 0 ${HEIGHT} Z`;

  useEffect(() => {
    draw.value = 0;
    draw.value = withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) });
  }, [draw, values]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: PATH_LENGTH * (1 - draw.value),
  }));

  return (
    <View>
      <Svg height={HEIGHT} preserveAspectRatio="none" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%">
        <Defs>
          <LinearGradient id="mintArea" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={colors.fresh} stopOpacity="0.28" />
            <Stop offset="1" stopColor={colors.fresh} stopOpacity="0.01" />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#mintArea)" />
        <AnimatedPath
          animatedProps={animatedProps}
          d={linePath}
          fill="none"
          stroke={colors.primary}
          strokeDasharray={`${PATH_LENGTH} ${PATH_LENGTH}`}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
        />
      </Svg>
      <View className="mt-2 flex-row justify-between">
        {['12am', '6am', '12pm', '6pm', 'Now'].map((label) => (
          <Text className="text-[11px] font-medium text-slate" key={label}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}
