import React, { useEffect, useMemo, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors } from '@/constants/design';
import { interpolateSeries } from '@/lib/chart';

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
  const cursorX = useSharedValue(0);
  const cursorY = useSharedValue(0);
  const cursorOpacity = useSharedValue(0);
  const [chartWidth, setChartWidth] = useState(WIDTH);
  const [selection, setSelection] = useState<{ temperature: number; time: string } | null>(null);
  const linePath = pointsToPath(values, WIDTH, HEIGHT - 12);
  const areaPath = `${linePath} L ${WIDTH} ${HEIGHT} L 0 ${HEIGHT} Z`;
  const minimum = Math.min(...values) - 0.8;
  const maximum = Math.max(...values) + 0.8;

  useEffect(() => {
    draw.value = 0;
    draw.value = withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) });
  }, [draw, values]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: PATH_LENGTH * (1 - draw.value),
  }));

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
    transform: [
      { translateX: cursorX.value - 6 },
      { translateY: cursorY.value - 6 },
    ],
  }));
  const guideStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
    transform: [{ translateX: cursorX.value }],
  }));
  const tooltipStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
    transform: [
      { translateX: Math.min(Math.max(0, cursorX.value - 48), chartWidth - 96) },
      { translateY: Math.max(0, cursorY.value - 42) },
    ],
  }));

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const x = Math.min(chartWidth, Math.max(0, event.nativeEvent.locationX));
          const progress = x / chartWidth;
          const temperature = interpolateSeries(values, progress);
          if (temperature === null) return;
          const y = (HEIGHT - 12) - ((temperature - minimum) / (maximum - minimum)) * (HEIGHT - 12);
          const minutes = Math.round(progress * 24 * 60);
          const hour = Math.min(23, Math.floor(minutes / 60));
          const minute = minutes % 60;
          const time = progress > 0.985
            ? 'Now'
            : `${hour % 12 || 12}:${String(minute).padStart(2, '0')}${hour < 12 ? 'am' : 'pm'}`;
          cursorX.value = x;
          cursorY.value = y;
          cursorOpacity.value = withTiming(1, { duration: 120 });
          setSelection({ temperature, time });
        },
        onPanResponderMove: (event) => {
          const x = Math.min(chartWidth, Math.max(0, event.nativeEvent.locationX));
          const progress = x / chartWidth;
          const temperature = interpolateSeries(values, progress);
          if (temperature === null) return;
          const y = (HEIGHT - 12) - ((temperature - minimum) / (maximum - minimum)) * (HEIGHT - 12);
          const minutes = Math.round(progress * 24 * 60);
          const hour = Math.min(23, Math.floor(minutes / 60));
          const minute = minutes % 60;
          const time = progress > 0.985
            ? 'Now'
            : `${hour % 12 || 12}:${String(minute).padStart(2, '0')}${hour < 12 ? 'am' : 'pm'}`;
          cursorX.value = withSpring(x, { damping: 30, stiffness: 420 });
          cursorY.value = withSpring(y, { damping: 30, stiffness: 420 });
          setSelection({ temperature, time });
        },
        onPanResponderRelease: () => {
          cursorOpacity.value = withTiming(0, { duration: 180 });
        },
        onPanResponderTerminate: () => {
          cursorOpacity.value = withTiming(0, { duration: 180 });
        },
      }),
    [chartWidth, cursorOpacity, cursorX, cursorY, maximum, minimum, values],
  );

  return (
    <View>
      <View
        {...panResponder.panHandlers}
        onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}
        style={styles.chart}>
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
        <Animated.View pointerEvents="none" style={[styles.guide, guideStyle]} />
        <Animated.View pointerEvents="none" style={[styles.cursor, cursorStyle]} />
        {selection && (
          <Animated.View pointerEvents="none" style={[styles.tooltip, tooltipStyle]}>
            <Text style={styles.tooltipTemperature}>{selection.temperature.toFixed(1)}°</Text>
            <Text style={styles.tooltipTime}>{selection.time}</Text>
          </Animated.View>
        )}
      </View>
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

const styles = StyleSheet.create({
  chart: {
    height: HEIGHT,
    position: 'relative',
  },
  guide: {
    backgroundColor: 'rgba(8, 122, 85, 0.18)',
    height: HEIGHT,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 1,
  },
  cursor: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.primary,
    borderRadius: 6,
    borderWidth: 3,
    height: 12,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 12,
  },
  tooltip: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 5,
    height: 32,
    justifyContent: 'center',
    left: 0,
    paddingHorizontal: 8,
    position: 'absolute',
    top: 0,
    width: 96,
  },
  tooltipTemperature: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  tooltipTime: {
    color: '#C7D1CC',
    fontSize: 10,
    fontWeight: '500',
  },
});
