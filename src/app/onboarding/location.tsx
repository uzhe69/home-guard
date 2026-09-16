import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { ChevronLeft, LocateFixed, LockKeyhole } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import MapView, { Circle, Marker, type Region } from 'react-native-maps';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { RadiusSettings } from '@/components/radius-settings';
import { colors } from '@/constants/design';
import { useApp } from '@/state/app-provider';

const DEFAULT_COORDINATE = { latitude: 1.3521, longitude: 103.8198 };

export default function LocationSetupScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { settings, patchSettings } = useApp();
  const [coordinate, setCoordinate] = useState(settings.homeLocation ?? DEFAULT_COORDINATE);
  const [radius, setRadius] = useState(settings.radiusMeters);
  const [locating, setLocating] = useState(false);

  const region: Region = {
    ...coordinate,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012,
  };

  async function useCurrentLocation() {
    setLocating(true);
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Location is off', 'Choose a point on the map, or enable location access in Settings.');
      setLocating(false);
      return;
    }
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const next = { latitude: current.coords.latitude, longitude: current.coords.longitude };
    setCoordinate(next);
    mapRef.current?.animateToRegion({ ...next, latitudeDelta: 0.012, longitudeDelta: 0.012 }, 600);
    setLocating(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <View className="flex-row items-center px-5 py-2">
        <Pressable className="h-11 w-11 items-center justify-center rounded-2xl bg-white" onPress={() => router.back()}>
          <ChevronLeft color={colors.primaryDark} size={25} />
        </Pressable>
        <Text className="ml-3 text-[14px] font-semibold uppercase tracking-[1.5px] text-primary">Home setup</Text>
      </View>
      <Animated.View entering={FadeInDown.duration(550)} className="px-6 pt-3">
        <Text className="text-[34px] font-bold tracking-[-1.2px] text-ink">Where is home?</Text>
        <Text className="mt-2 text-[16px] leading-6 text-slate">Set a location so we know when you’re away.</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(600)} className="mx-5 mt-6 flex-1 overflow-hidden rounded-[30px] border border-line bg-white p-1.5">
        <MapView
          ref={mapRef}
          initialRegion={region}
          mapType="standard"
          onLongPress={(event) => setCoordinate(event.nativeEvent.coordinate)}
          showsCompass={false}
          showsPointsOfInterests
          style={{ flex: 1, borderRadius: 25 }}>
          <Circle
            center={coordinate}
            fillColor="rgba(54,183,125,0.18)"
            radius={radius}
            strokeColor={colors.fresh}
            strokeWidth={2}
          />
          <Marker coordinate={coordinate} pinColor={colors.primary} title="Home" />
        </MapView>
        <Pressable
          className="absolute right-5 top-5 h-12 w-12 items-center justify-center rounded-2xl bg-white"
          onPress={useCurrentLocation}
          style={{ shadowColor: '#10231E', shadowOpacity: 0.12, shadowRadius: 14 }}>
          <LocateFixed color={colors.primary} size={22} />
        </Pressable>
      </Animated.View>

      <View className="px-5 pb-3 pt-4">
        <Text className="mb-2 text-[14px] font-semibold text-ink">Home radius</Text>
        <RadiusSettings value={radius} onChange={async (meters) => setRadius(meters)} />
        <Text className="mt-3 text-center text-[12px] text-slate">Long-press the map to move your home pin.</Text>
        <View className="mt-4">
          <Button
            label={locating ? 'Finding you…' : 'Confirm location'}
            loading={locating}
            onPress={async () => {
              await patchSettings({
                homeLocation: coordinate,
                homeAddress: '18 Tampines Avenue 1, Singapore',
                radiusMeters: radius,
              });
              router.push('/onboarding/stove');
            }}
          />
        </View>
        <View className="mt-3 flex-row items-center justify-center gap-1.5">
          <LockKeyhole color={colors.slate} size={13} />
          <Text className="text-[12px] text-slate">Your exact location stays on this device.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
