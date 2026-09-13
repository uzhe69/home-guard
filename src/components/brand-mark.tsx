import { House, Leaf } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { colors } from '@/constants/design';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View className="flex-row items-center gap-2.5">
      <View className={compact ? 'h-9 w-9 items-center justify-center rounded-xl bg-mint' : 'h-12 w-12 items-center justify-center rounded-2xl bg-mint'}>
        <House color={colors.primary} size={compact ? 21 : 27} strokeWidth={2.4} />
        <View className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-0.5">
          <Leaf color={colors.fresh} fill={colors.fresh} size={compact ? 11 : 14} />
        </View>
      </View>
      <Text className={compact ? 'text-[17px] font-bold tracking-[-0.4px] text-ink' : 'text-[22px] font-bold tracking-[-0.6px] text-ink'}>
        Home Guard
      </Text>
    </View>
  );
}
