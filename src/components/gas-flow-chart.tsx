import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';

import { colors } from '@/constants/design';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const WIDTH = 330;
const HEIGHT = 118;
const PATH_LENGTH = 700;

function pointsToPath(values: number[]) {
  const max = Math.max(1, ...values) * 1.12;
  const points = values.map((value, index) => ({
    x: (index / Math.max(1, values.length - 1)) * WIDTH,
    y: HEIGHT - 10 - (value / max) * (HEIGHT - 20),
  }));

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const midX = (previous.x + point.x) / 2;
    return `${path} C ${midX} ${previous.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
  }, '');
}

export function GasFlowChart({ values }: { values: number[] }) {
  const draw = useSharedValue(0);
  const linePath = pointsToPath(values);
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
          <LinearGradient id="gasArea" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={colors.flame} stopOpacity="0.3" />
            <Stop offset="1" stopColor={colors.flame} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        {[0.33, 0.66].map((ratio) => (
          <Line key={ratio} stroke={colors.warmLine} strokeWidth="1" x1="0" x2={WIDTH} y1={HEIGHT * ratio} y2={HEIGHT * ratio} />
        ))}
        <Path d={areaPath} fill="url(#gasArea)" />
        <AnimatedPath
          animatedProps={animatedProps}
          d={linePath}
          fill="none"
          stroke={colors.ember}
          strokeDasharray={`${PATH_LENGTH} ${PATH_LENGTH}`}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
        />
      </Svg>
      <View className="mt-2 flex-row justify-between">
        {['6am', '9am', '12pm', '3pm', 'Now'].map((label) => (
          <Text className="text-[11px] font-medium text-slate" key={label}>{label}</Text>
        ))}
      </View>
    </View>
  );
}
