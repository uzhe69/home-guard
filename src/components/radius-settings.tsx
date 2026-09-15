import React, { useState } from 'react';
import { View } from 'react-native';

import { RangeInput } from '@/components/range-input';
import { SegmentedControl } from '@/components/ui/segmented-control';

export function RadiusSettings({ value, onChange }: { value: number; onChange: (meters: number) => Promise<void> }) {
  const [custom, setCustom] = useState(false);
  const showCustom = custom || ![100, 200, 300].includes(value);
  return (
    <View>
      <SegmentedControl<number | string>
        value={showCustom ? 'custom' : value}
        segments={[{ label: '100 m', value: 100 }, { label: '200 m', value: 200 }, { label: '300 m', value: 300 }, { label: 'Custom', value: 'custom' }]}
        onChange={(meters) => { setCustom(meters === 'custom'); if (typeof meters === 'number') void onChange(meters); }}
      />
      {showCustom && <RangeInput label="Custom home radius in meters" minimum={1} value={value} onSave={onChange} />}
    </View>
  );
}
