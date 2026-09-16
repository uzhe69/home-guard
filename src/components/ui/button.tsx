import { cva, type VariantProps } from 'class-variance-authority';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { cn } from '@/lib/cn';

const buttonVariants = cva('h-14 flex-row items-center justify-center gap-2 rounded-2xl px-5', {
  variants: {
    variant: {
      primary: 'bg-primary',
      secondary: 'border border-primary bg-white',
      subtle: 'bg-mint',
      ghost: 'bg-transparent',
      stove: 'bg-ember',
      stoveSecondary: 'border border-ember bg-white',
    },
  },
  defaultVariants: { variant: 'primary' },
});

const labelVariants = cva('text-[16px] font-semibold', {
  variants: {
    variant: {
      primary: 'text-white',
      secondary: 'text-primary',
      subtle: 'text-primary',
      ghost: 'text-primary',
      stove: 'text-white',
      stoveSecondary: 'text-ember',
    },
  },
  defaultVariants: { variant: 'primary' },
});

type ButtonProps = PressableProps &
  VariantProps<typeof buttonVariants> & {
    label: string;
    loading?: boolean;
    left?: React.ReactNode;
    className?: string;
  };

export function Button({
  label,
  variant = 'primary',
  loading,
  left,
  className,
  disabled,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  onPress,
  ...props
}: ButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        className={cn(buttonVariants({ variant }), disabled && 'opacity-45', className)}
        disabled={disabled || loading}
        onHoverIn={(event) => {
          scale.value = withSpring(1.012, { damping: 20, stiffness: 280 });
          onHoverIn?.(event);
        }}
        onHoverOut={(event) => {
          scale.value = withSpring(1, { damping: 20, stiffness: 280 });
          onHoverOut?.(event);
        }}
        onPress={async (event) => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.(event);
        }}
        onPressIn={(event) => {
          scale.value = withSpring(0.975, { damping: 18, stiffness: 320 });
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          scale.value = withSpring(1, { damping: 18, stiffness: 320 });
          onPressOut?.(event);
        }}
        {...props}>
        {loading ? <ActivityIndicator color={variant === 'primary' || variant === 'stove' ? 'white' : '#087A55'} /> : left}
        <Text className={labelVariants({ variant })}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}
