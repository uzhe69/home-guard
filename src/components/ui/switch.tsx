import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

type SwitchProps = { value: boolean; onValueChange: (value: boolean) => void };

export function Switch({ value, onValueChange }: SwitchProps) {
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(value ? 22 : 2, { damping: 18, stiffness: 280 }) }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      className={value ? 'h-8 w-[52px] rounded-full bg-primary' : 'h-8 w-[52px] rounded-full bg-[#D8DEDA]'}
      onPress={async () => {
        await Haptics.selectionAsync();
        onValueChange(!value);
      }}>
      <Animated.View className="mt-0.5 h-7 w-7 rounded-full bg-white" style={thumbStyle} />
    </Pressable>
  );
}
