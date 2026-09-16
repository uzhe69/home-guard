import { Stack } from 'expo-router';
import React from 'react';

import { colors } from '@/constants/design';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.canvas },
        headerShown: false,
      }}
    />
  );
}
