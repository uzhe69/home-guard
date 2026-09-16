import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export function useScreenEntrance() {
  const opacity = useSharedValue(1);
  const offset = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      opacity.value = 0.82;
      offset.value = 10;
      opacity.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
      offset.value = withSpring(0, { damping: 22, stiffness: 230 });

      return () => {
        cancelAnimation(opacity);
        cancelAnimation(offset);
      };
    }, [offset, opacity]),
  );

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offset.value }],
  }));
}
