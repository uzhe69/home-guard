import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

type Segment<T extends string | number> = { label: string; value: T };

type SegmentedControlProps<T extends string | number> = {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string | number>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View className="flex-row rounded-[18px] bg-[#EEF1EF] p-1">
      {segments.map((segment) => {
        const selected = segment.value === value;
        return (
          <Pressable
            key={String(segment.value)}
            className="flex-1"
            onPress={async () => {
              await Haptics.selectionAsync();
              onChange(segment.value);
            }}>
            <Animated.View
              layout={LinearTransition.springify().damping(20)}
              className={selected ? 'rounded-[14px] bg-primary py-3' : 'rounded-[14px] py-3'}>
              <Text
                className={
                  selected
                    ? 'text-center text-[14px] font-semibold text-white'
                    : 'text-center text-[14px] font-medium text-slate'
                }>
                {segment.label}
              </Text>
            </Animated.View>
          </Pressable>
        );
      })}
    </View>
  );
}
