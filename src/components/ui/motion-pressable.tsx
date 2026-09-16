import React from 'react';
import { Pressable, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

type MotionPressableProps = PressableProps & {
  className?: string;
  hoverScale?: number;
  pressScale?: number;
};

export function MotionPressable({
  hoverScale = 1.012,
  pressScale = 0.98,
  onHoverIn,
  onHoverOut,
  onPressIn,
  onPressOut,
  ...props
}: MotionPressableProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onHoverIn={(event) => {
          scale.value = withTiming(hoverScale, { duration: 160 });
          onHoverIn?.(event);
        }}
        onHoverOut={(event) => {
          scale.value = withTiming(1, { duration: 160 });
          onHoverOut?.(event);
        }}
        onPressIn={(event) => {
          scale.value = withSpring(pressScale, { damping: 20, stiffness: 360 });
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          scale.value = withSpring(1, { damping: 20, stiffness: 360 });
          onPressOut?.(event);
        }}
        {...props}
      />
    </Animated.View>
  );
}
