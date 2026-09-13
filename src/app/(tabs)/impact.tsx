import { CalendarDays, DollarSign, Leaf, Sprout } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedCount } from '@/components/animated-count';
import { AppHeader } from '@/components/app-header';
import { ImpactChart } from '@/components/impact-chart';
import { Card } from '@/components/ui/card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { colors } from '@/constants/design';

type Period = 'week' | 'month' | 'all';

const impact = {
  week: { energy: 4.8, money: 1.42, carbon: 3.2, saves: 3, values: [0.3, 0.5, 1, 0.7, 0.8, 1.6, 2] },
  month: { energy: 21.4, money: 6.33, carbon: 14.3, saves: 14, values: [1.1, 1.9, 2.3, 2.8, 3.2, 4.6, 5.5] },
  all: { energy: 86.7, money: 25.65, carbon: 58.1, saves: 52, values: [3, 7, 12, 18, 27, 38, 52] },
};

export default function ImpactScreen() {
  const [period, setPeriod] = useState<Period>('week');
  const data = impact[period];

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(500)}>
          <AppHeader />
          <Text className="text-[36px] font-bold tracking-[-1.5px] text-ink">Your impact</Text>
          <Text className="mt-1 text-[16px] text-slate">Small actions make a cleaner tomorrow.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(600)} className="mt-6">
          <SegmentedControl
            onChange={setPeriod}
            segments={[
              { label: 'This week', value: 'week' },
              { label: 'This month', value: 'month' },
              { label: 'All time', value: 'all' },
            ]}
            value={period}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(650)} className="mt-4">
          <Card className="p-5">
            <View className="flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-[15px] bg-mint">
                <Leaf color={colors.fresh} fill={colors.fresh} size={25} />
              </View>
              <View className="ml-3">
                <AnimatedCount className="text-[32px] font-bold tracking-[-1px] text-ink" decimals={1} suffix=" kWh" value={data.energy} />
                <Text className="mt-0.5 text-[13px] text-slate">Energy saved</Text>
              </View>
            </View>
            <View className="mt-7">
              <ImpactChart values={data.values} />
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(230).duration(650)} className="mt-3 flex-row gap-3">
          <Card className="flex-1 p-4">
            <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-mint">
              <DollarSign color={colors.primary} size={20} />
            </View>
            <AnimatedCount className="mt-4 text-[27px] font-bold tracking-[-0.6px] text-ink" decimals={2} prefix="$" value={data.money} />
            <Text className="mt-1 text-[13px] text-slate">Estimated savings</Text>
          </Card>
          <Card className="flex-1 p-4">
            <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-mint">
              <Sprout color={colors.primary} size={20} />
            </View>
            <AnimatedCount className="mt-4 text-[27px] font-bold tracking-[-0.6px] text-ink" decimals={1} suffix=" kg" value={data.carbon} />
            <Text className="mt-1 text-[13px] text-slate">CO₂ avoided</Text>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(310).duration(650)} className="mt-3">
          <Card className="flex-row items-center p-4">
            <View className="h-12 w-12 items-center justify-center rounded-[15px] bg-mint">
              <CalendarDays color={colors.primary} size={23} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[15px] font-bold text-ink">{data.saves} smart saves</Text>
              <Text className="mt-0.5 text-[13px] text-slate">A cooler home and a lighter footprint.</Text>
            </View>
            <View className="flex-row gap-1.5">
              {[0, 1, 2, 3].map((dot) => (
                <View className={dot < 3 ? 'h-2.5 w-2.5 rounded-full bg-fresh' : 'h-2.5 w-2.5 rounded-full bg-line'} key={dot} />
              ))}
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(390).duration(650)} className="mt-4 flex-row items-center rounded-[24px] bg-mintSoft p-5">
          <Sprout color={colors.fresh} size={30} />
          <Text className="ml-4 flex-1 text-[15px] font-semibold leading-5 text-primaryDark">
            A more sustainable Singapore, one home at a time.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
