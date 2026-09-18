import { CalendarDays, DollarSign, Flame, Leaf, Snowflake, Sprout } from 'lucide-react-native';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedCount } from '@/components/animated-count';
import { AppHeader } from '@/components/app-header';
import { ImpactChart } from '@/components/impact-chart';
import { Card } from '@/components/ui/card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { colors } from '@/constants/design';
import { useScreenEntrance } from '@/lib/motion';

type Period = 'week' | 'month' | 'all';

const impact = {
  week: { energy: 6.1, money: 1.86, carbon: 4, saves: 5, acEnergy: 4.8, stoveEnergy: 1.3, acSaves: 3, stoveSaves: 2, values: [0.5, 0.7, 1.2, 0.9, 1.1, 1.8, 2.3] },
  month: { energy: 27.6, money: 8.42, carbon: 18.5, saves: 21, acEnergy: 21.4, stoveEnergy: 6.2, acSaves: 14, stoveSaves: 7, values: [1.5, 2.4, 3.1, 3.7, 4.2, 5.7, 7] },
  all: { energy: 111.9, money: 34.78, carbon: 75, saves: 78, acEnergy: 86.7, stoveEnergy: 25.2, acSaves: 52, stoveSaves: 26, values: [4, 9, 16, 24, 35, 50, 69] },
};

export default function ImpactScreen() {
  const [period, setPeriod] = useState<Period>('week');
  const data = impact[period];
  const screenStyle = useScreenEntrance();

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <Animated.ScrollView contentContainerStyle={{ paddingBottom: 28, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} style={screenStyle}>
        <Animated.View entering={FadeInUp.duration(500)}>
          <AppHeader />
          <Text className="text-[36px] font-bold tracking-[-1.5px] text-ink">Your impact</Text>
          <Text className="mt-1 text-[16px] text-slate">Combined savings from AC and stove.</Text>
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
                <Text className="mt-0.5 text-[13px] text-slate">Combined energy saved</Text>
              </View>
            </View>
            <View className="mt-7">
              <ImpactChart values={data.values} />
            </View>
            <View className="mt-6 border-t border-line pt-5">
              <View className="flex-row items-center">
                <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-mint">
                  <Snowflake color={colors.primary} size={18} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[14px] font-semibold text-ink">AC cooling</Text>
                  <Text className="mt-0.5 text-[11px] text-slate">{data.acSaves} smart saves</Text>
                </View>
                <Text className="text-[14px] font-bold text-primary">{data.acEnergy.toFixed(1)} kWh</Text>
              </View>
              <View className="mt-3 flex-row items-center">
                <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-warmth">
                  <Flame color={colors.ember} size={18} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[14px] font-semibold text-ink">Gas stove</Text>
                  <Text className="mt-0.5 text-[11px] text-slate">{data.stoveSaves} smart saves</Text>
                </View>
                <Text className="text-[14px] font-bold text-ember">{data.stoveEnergy.toFixed(1)} kWh</Text>
              </View>
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
              <Text className="text-[15px] font-bold text-ink">{data.saves} smart interventions</Text>
              <Text className="mt-0.5 text-[13px] text-slate">Cooling and cooking waste avoided.</Text>
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
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
