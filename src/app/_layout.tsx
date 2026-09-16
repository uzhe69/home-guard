import '@/global.css';
import '@/services/geofencing';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/constants/design';
import { AppProvider } from '@/state/app-provider';

LogBox.ignoreLogs([
  'SafeAreaView has been deprecated and will be removed in a future release.',
]);

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            animation: 'fade_from_bottom',
            contentStyle: { backgroundColor: colors.canvas },
            headerShown: false,
          }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        </Stack>
      </AppProvider>
    </SafeAreaProvider>
  );
}
