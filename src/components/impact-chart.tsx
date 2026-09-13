import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';

import { colors } from '@/constants/design';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const WIDTH = 330;
const HEIGHT = 150;
const DRAW_LENGTH = 700;

function getPoints(values: number[]) {
  const max = Math.max(...values) * 1.1;
  return values.map((value, index) => ({
    x: 8 + (index / (values.length - 1)) * (WIDTH - 16),
    y: HEIGHT - 14 - (value / max) * (HEIGHT - 28),
  }));
}

function makePath(points: { x: number; y: number }[]) {
  return points.reduce((path, point, index) => {
    if (!index) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const mid = (previous.x + point.x) / 2;
    return `${path} C ${mid} ${previous.y}, ${mid} ${point.y}, ${point.x} ${point.y}`;
  }, '');
}

export function ImpactChart({ values }: { values: number[] }) {
  const progress = useSharedValue(0);
  const points = getPoints(values);
  const path = makePath(points);
  const area = `${path} L ${points.at(-1)?.x ?? WIDTH} ${HEIGHT} L ${points[0].x} ${HEIGHT} Z`;

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 1050, easing: Easing.out(Easing.cubic) });
  }, [progress, values]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: DRAW_LENGTH * (1 - progress.value),
  }));

  return (
    <View>
      <Svg height={HEIGHT} preserveAspectRatio="none" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%">
        <Defs>
          <LinearGradient id="impactArea" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={colors.fresh} stopOpacity="0.35" />
            <Stop offset="1" stopColor={colors.fresh} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <Line key={ratio} stroke={colors.line} strokeWidth="1" x1="0" x2={WIDTH} y1={HEIGHT * ratio} y2={HEIGHT * ratio} />
        ))}
        <Path d={area} fill="url(#impactArea)" />
        <AnimatedPath
          animatedProps={animatedProps}
          d={path}
          fill="none"
          stroke={colors.primary}
          strokeDasharray={`${DRAW_LENGTH} ${DRAW_LENGTH}`}
          strokeLinecap="round"
          strokeWidth="3"
        />
        {points.map((point, index) => (
          <Circle cx={point.x} cy={point.y} fill="white" key={index} r="3.5" stroke={colors.primary} strokeWidth="2" />
        ))}
      </Svg>
      <View className="mt-1 flex-row justify-between px-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <Text className="text-[10px] font-medium text-slate" key={day}>{day}</Text>
        ))}
      </View>
    </View>
  );
}
