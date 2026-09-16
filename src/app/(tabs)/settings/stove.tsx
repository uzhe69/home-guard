import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { DurationInput } from '@/components/duration-input';
import { SettingsLabel, SettingsPage } from '@/components/settings-page';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useApp } from '@/state/app-provider';

export default function StoveSettingsScreen() {
  const { patchSettings, settings } = useApp();
  const [customInactivity, setCustomInactivity] = useState(false);
  const showCustomInactivity =
    customInactivity || ![30, 60, 90].includes(settings.kitchenInactivityMinutes);

  return (
    <SettingsPage subtitle="Choose when heat and inactivity should trigger an alert." title="Stove safety">
      <SettingsLabel>Motion inactivity</SettingsLabel>
      <SegmentedControl<number | string>
        onChange={(duration) => {
          setCustomInactivity(duration === 'custom');
          if (typeof duration === 'number') void patchSettings({ kitchenInactivityMinutes: duration });
        }}
        segments={[
          { label: '30 min', value: 30 },
          { label: '60 min', value: 60 },
          { label: '90 min', value: 90 },
          { label: 'Custom', value: 'custom' },
        ]}
        value={showCustomInactivity ? 'custom' : settings.kitchenInactivityMinutes}
      />
      <Text className="mt-2 text-[12px] leading-5 text-slate">
        Alert only while the infrared sensor detects heat and no motion is detected for{' '}
        {settings.kitchenInactivityMinutes} minutes.
      </Text>
      {showCustomInactivity && (
        <View className="mt-3">
          <DurationInput
            label="Custom inactivity duration in minutes"
            onSave={(kitchenInactivityMinutes) => patchSettings({ kitchenInactivityMinutes })}
            submitLabel="Save duration"
            value={settings.kitchenInactivityMinutes}
          />
        </View>
      )}

      <View className="mt-7">
        <SettingsLabel>Departure alert delay</SettingsLabel>
        <SegmentedControl<2 | 3 | 5>
          onChange={(stoveDepartureDelayMinutes) => void patchSettings({ stoveDepartureDelayMinutes })}
          segments={[
            { label: '2 min', value: 2 },
            { label: '3 min', value: 3 },
            { label: '5 min', value: 5 },
          ]}
          value={settings.stoveDepartureDelayMinutes}
        />
        <Text className="mt-2 text-[12px] leading-5 text-slate">
          High-priority warning when your phone leaves the home radius while the stove is hot.
          Cooking timers do not delay this warning.
        </Text>
      </View>
    </SettingsPage>
  );
}
