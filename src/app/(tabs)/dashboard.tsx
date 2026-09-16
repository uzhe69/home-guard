import { Clock3, Power, Radio, Sparkles, ThermometerSnowflake, Wifi } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { TemperatureChart } from '@/components/temperature-chart';
import { TemperatureGauge } from '@/components/temperature-gauge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { colors } from '@/constants/design';
import { useScreenEntrance } from '@/lib/motion';
import { useApp } from '@/state/app-provider';

function StatusDot() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.3, { duration: 1100 }), -1, true);
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View className="h-2.5 w-2.5 rounded-full bg-fresh" style={style} />;
}

export default function DashboardScreen() {
  const {
    temperature,
    temperatureHistory,
    acPowerState,
    connectionStatus,
    lastCommandLabel,
    lastUpdatedLabel,
    isAway,
    acMonitoring,
    refreshDevice,
    turnOff,
  } = useApp();
  const [refreshing, setRefreshing] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const screenStyle = useScreenEntrance();
  const acStatusLabel =
    acPowerState === 'ON'
      ? 'On'
      : acPowerState === 'OFF'
        ? 'Off'
        : acMonitoring.status === 'likely-on'
          ? 'Likely on'
          : acMonitoring.status === 'warming'
            ? 'Room warming'
            : acMonitoring.status === 'off'
              ? 'No alert needed'
              : acMonitoring.status === 'waiting'
                ? 'Observing'
                : acMonitoring.status === 'home'
                  ? 'Ready'
                  : 'Unable to verify';

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: 28, paddingHorizontal: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={async () => {
              setRefreshing(true);
              await refreshDevice();
              setRefreshing(false);
            }}
          />
        }
        style={screenStyle}
        showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(500)}>
          <AppHeader />
          <Text className="text-[36px] font-bold tracking-[-1.5px] text-ink">
            {isAway ? 'You’re away' : 'Good morning'}
          </Text>
          <Text className="mt-1 text-[16px] text-slate">
            {isAway ? 'We’ll keep an eye on your home.' : 'A more sustainable home, together.'}
          </Text>
        </Animated.View>

        {isAway && (
          <Animated.View entering={FadeInDown.springify().damping(18)} className="mt-5 flex-row items-center rounded-[20px] bg-mint p-4">
            <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-white">
              <Sparkles color={colors.primary} size={21} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[14px] font-semibold text-ink">{acMonitoring.status === 'unable-to-verify' ? 'Unable to verify AC status' : 'Monitoring your room'}</Text>
              <Text className="mt-0.5 text-[12px] leading-5 text-slate">{acMonitoring.explanation}</Text>
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(100).duration(650)} className="mt-6 items-center">
          <View className="mb-4 flex-row items-center gap-2 rounded-full bg-mint px-4 py-2">
            <Radio color={colors.primary} size={15} />
            <Text className="text-[14px] font-semibold text-primary">Home</Text>
          </View>
          {Number.isFinite(temperature) ? <TemperatureGauge temperature={temperature} /> : <Text className="py-10 text-[16px] text-slate">Room temperature unavailable</Text>}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(650)} className="mt-5">
          <View className="flex-row items-center rounded-[20px] bg-mintSoft px-5 py-4">
            <Wifi color={colors.primary} size={21} />
            <View className="ml-3 flex-1">
              <Text className="text-[14px] font-semibold text-primary">AC sensor is {connectionStatus === 'online' ? 'online' : connectionStatus}</Text>
              <Text className="mt-0.5 text-[12px] text-slate">Bedroom sensor • {lastUpdatedLabel}</Text>
            </View>
            {connectionStatus === 'online' && <StatusDot />}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).duration(650)} className="mt-3 flex-row gap-3">
          <Card className="flex-1 p-4">
            <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-mint">
              <ThermometerSnowflake color={colors.primary} size={20} />
            </View>
            <Text className="mt-3 text-[13px] text-slate">AC likelihood</Text>
            <Text className="mt-0.5 text-[16px] font-bold text-ink">{acStatusLabel}</Text>
          </Card>
          <Card className="flex-1 p-4">
            <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-mint">
              <Clock3 color={colors.primary} size={20} />
            </View>
            <Text className="mt-3 text-[13px] text-slate">Last command</Text>
            <Text className="mt-0.5 text-[16px] font-bold text-ink" numberOfLines={1}>{lastCommandLabel}</Text>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(650)} className="mt-4">
          <Button
            label="Turn off AC"
            left={<Power color="white" size={20} strokeWidth={2.5} />}
            loading={sending}
            onPress={async () => {
              setSending(true);
              await turnOff();
              setSending(false);
            }}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(360).duration(650)} className="mt-5">
          <Card className="p-5">
            <View className="mb-5 flex-row items-end justify-between">
              <View>
                <Text className="text-[18px] font-bold text-ink">Today</Text>
                <Text className="mt-1 text-[13px] text-slate">A comfortable, steady room</Text>
              </View>
              <Text className="text-[13px] font-semibold text-primary">20°–28°</Text>
            </View>
            <TemperatureChart values={temperatureHistory} />
          </Card>
        </Animated.View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
