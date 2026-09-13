import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/constants/design';
import { useApp } from '@/state/app-provider';

export default function IndexScreen() {
  const { ready, settings } = useApp();

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={colors.primary} size="small" />
      </View>
    );
  }

  return <Redirect href={settings.setupComplete ? '/dashboard' : '/onboarding'} />;
}
