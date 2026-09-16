import {
  Clock3,
  Flame,
  MapPinCheck,
  ScanLine,
  ShieldCheck,
  TriangleAlert,
  Wifi,
} from 'lucide-react-native';
import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { DurationInput } from '@/components/duration-input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { colors } from '@/constants/design';
import { dismissStoveAlerts } from '@/services/notifications';
import { useApp } from '@/state/app-provider';

function StoveStatus({ active }: { active: boolean }) {
  const firstPulse = useSharedValue(0);
  const secondPulse = useSharedValue(0);

  React.useEffect(() => {
    cancelAnimation(firstPulse);
    cancelAnimation(secondPulse);
    firstPulse.value = 0;
    secondPulse.value = 0;
    if (!active) return;

    const createPulse = () =>
      withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.out(Easing.cubic) }),
        -1,
        false,
      );
    firstPulse.value = createPulse();
    secondPulse.value = withDelay(850, createPulse());

    return () => {
      cancelAnimation(firstPulse);
      cancelAnimation(secondPulse);
    };
  }, [active, firstPulse, secondPulse]);

  const firstPulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(firstPulse.value, [0, 0.25, 1], [0, 0.28, 0]),
    transform: [{ scale: interpolate(firstPulse.value, [0, 1], [0.72, 1.28]) }],
  }));
  const secondPulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(secondPulse.value, [0, 0.25, 1], [0, 0.2, 0]),
    transform: [{ scale: interpolate(secondPulse.value, [0, 1], [0.72, 1.28]) }],
  }));
  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + Math.sin(firstPulse.value * Math.PI) * 0.055 }],
  }));

  return (
    <View className="items-center py-3">
      <View className="h-[188px] w-[188px] items-center justify-center rounded-full bg-warmthSoft">
        {active && (
          <>
            <Animated.View className="absolute h-[132px] w-[132px] rounded-full border border-flame" style={firstPulseStyle} />
            <Animated.View className="absolute h-[132px] w-[132px] rounded-full border border-flame" style={secondPulseStyle} />
          </>
        )}
        <View className="h-[142px] w-[142px] items-center justify-center rounded-full border border-warmLine bg-warmth">
          <Animated.View
            className={active ? 'h-[92px] w-[92px] items-center justify-center rounded-full bg-ember' : 'h-[92px] w-[92px] items-center justify-center rounded-full bg-white'}
            style={active ? flameStyle : undefined}>
            <Flame color={active ? 'white' : colors.slate} fill={active ? 'white' : 'transparent'} size={48} strokeWidth={1.9} />
          </Animated.View>
        </View>
      </View>
      <Text className="mt-5 text-[27px] font-bold tracking-[-0.8px] text-ink">
        Stove is {active ? 'hot' : 'cool'}
      </Text>
    </View>
  );
}

export default function StoveScreen() {
  const {
    isAway,
    refreshStove,
    settings,
    patchSettings,
    stove,
    stoveInactiveMinutes,
    stoveLastMotionLabel,
    stoveLastUpdatedLabel,
    stoveRisk,
  } = useApp();
  const [refreshing, setRefreshing] = React.useState(false);
  const [dismissedRisk, setDismissedRisk] = React.useState<string | null>(null);
  const runtimeMinutes = stove.hotSince
    ? Math.max(1, Math.round((Date.now() - stove.hotSince) / 60_000))
    : 0;
  const riskKey = `${stoveRisk}:${stove.lastMotionAt}:${stove.hotSince}:${settings.phoneDepartedAt}`;
  const cookingMinutesRemaining = Math.max(0, Math.ceil(((settings.cookingTimerEndsAt ?? 0) - Date.now()) / 60_000));
  const hasRisk = stoveRisk !== 'none' && dismissedRisk !== riskKey;

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 28, paddingHorizontal: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.ember}
            onRefresh={async () => {
              setRefreshing(true);
              await refreshStove();
              setRefreshing(false);
            }}
          />
        }
        showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(500)}>
          <AppHeader />
          <Text className="text-[36px] font-bold tracking-[-1.5px] text-ink">Kitchen watch</Text>
          <Text className="mt-1 text-[16px] text-slate">Infrared heat and kitchen motion checks.</Text>
        </Animated.View>

        {hasRisk && (
          <Animated.View entering={FadeInDown.springify().damping(18)} className="mt-5 flex-row items-center rounded-[20px] bg-[#FBE6DC] p-4">
            <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-white">
              <TriangleAlert color={colors.ember} size={22} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[14px] font-semibold text-[#6F3213]">
                {stoveRisk === 'away' ? 'Hot stove while you’re away' : 'Kitchen inactivity detected'}
              </Text>
              <Text className="mt-0.5 text-[12px] leading-4 text-[#8B583B]">
                {stoveRisk === 'away'
                  ? 'Your phone left the home radius while the stove is hot.'
                  : `No motion for ${stoveInactiveMinutes} min while the stove remains hot.`}
              </Text>
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(100).duration(650)} className="mt-6">
          <Card className="items-center border-warmLine bg-white px-5 pb-5 pt-3">
            <StoveStatus active={stove.isHot} />
            <View className="flex-row items-center gap-2 rounded-full bg-warmthSoft px-4 py-2">
              <MapPinCheck color={colors.ember} size={15} />
              <Text className="text-[13px] font-semibold text-ember">{isAway ? 'Away' : 'Home'} • {runtimeMinutes > 0 ? `${runtimeMinutes} min hot` : 'no heat detected'}</Text>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(170).duration(650)} className="mt-4 flex-row items-center rounded-[20px] bg-warmthSoft px-5 py-4">
          <Wifi color={colors.ember} size={21} />
          <View className="ml-3 flex-1">
            <Text className="text-[14px] font-semibold text-ember">Kitchen sensors are {stove.connectionStatus}</Text>
            <Text className="mt-0.5 text-[12px] text-slate">Infrared temperature + motion sensor • {stoveLastUpdatedLabel}</Text>
          </View>
          <View className={stove.connectionStatus === 'online' ? 'h-2.5 w-2.5 rounded-full bg-flame' : 'h-2.5 w-2.5 rounded-full bg-slate'} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(230).duration(650)} className="mt-3 flex-row gap-3">
          <Card className="flex-1 border-warmLine p-4">
            <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-warmth">
              <Flame color={colors.ember} size={20} />
            </View>
            <Text className="mt-3 text-[13px] text-slate">Infrared temperature</Text>
            <Text className="mt-0.5 text-[16px] font-bold text-ink">{stove.temperatureCelsius === null ? 'No reading' : `${stove.temperatureCelsius.toFixed(1)}°C`}</Text>
          </Card>
          <Card className="flex-1 border-warmLine p-4">
            <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-warmth">
              <ScanLine color={colors.ember} size={20} />
            </View>
            <Text className="mt-3 text-[13px] text-slate">Kitchen motion</Text>
            <Text className="mt-0.5 text-[16px] font-bold text-ink" numberOfLines={1}>{stoveLastMotionLabel}</Text>
          </Card>
        </Animated.View>

        {hasRisk && (
          <Animated.View entering={FadeInDown.delay(290).duration(650)} className="mt-4 flex-row gap-3">
            <Button className="flex-1" label="Acknowledge" onPress={() => { setDismissedRisk(riskKey); void dismissStoveAlerts(stove.deviceId); }} variant="stove" />
            <Button className="flex-1" label="Dismiss" onPress={() => { setDismissedRisk(riskKey); void dismissStoveAlerts(stove.deviceId); }} variant="stoveSecondary" />
          </Animated.View>
        )}
        <Animated.View entering={FadeInDown.delay(350).duration(650)} className="mt-5">
          <Card className="border-warmLine p-5">
            <Text className="text-[18px] font-bold text-ink">One-time cooking timer</Text>
            <Text className="mb-4 mt-2 text-[13px] leading-5 text-slate">For stews and other longer cooks, pause motion-inactivity alerts until the timer ends. Departure alerts stay active.</Text>
            {cookingMinutesRemaining > 0 ? (
              <View className="gap-3">
                <Text className="text-[16px] font-semibold text-ember">{cookingMinutesRemaining} minutes remaining</Text>
                <Text className="text-[12px] leading-5 text-slate">Normal inactivity checks resume when this timer ends.</Text>
                <Button label="Cancel cooking timer" onPress={() => void patchSettings({ cookingTimerEndsAt: null })} variant="stoveSecondary" />
              </View>
            ) : !stove.isHot ? (
              <Text className="text-[13px] text-slate">Start a timer once the stove is hot.</Text>
            ) : (
              <DurationInput label="Cooking duration in minutes" value={120} submitLabel="Start cooking timer" onSave={(minutes) => patchSettings({ cookingTimerEndsAt: Date.now() + minutes * 60_000 })} />
            )}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(410).duration(650)} className="mt-4 rounded-[24px] bg-warmthSoft p-5">
          <View className="flex-row items-center">
            <ShieldCheck color={colors.ember} size={23} />
            <Text className="ml-3 text-[16px] font-bold text-ink">Safety checks armed</Text>
          </View>
          <View className="mt-4 flex-row items-start">
            <Clock3 color={colors.flame} size={18} />
            <Text className="ml-3 flex-1 text-[13px] leading-5 text-slate">Alert after {settings.kitchenInactivityMinutes} minutes with continuous heat and no kitchen motion.</Text>
          </View>
          <View className="mt-3 flex-row items-start">
            <MapPinCheck color={colors.flame} size={18} />
            <Text className="ml-3 flex-1 text-[13px] leading-5 text-slate">High-priority alert {settings.stoveDepartureDelayMinutes} minutes after your phone leaves the home radius while the stove is hot.</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
