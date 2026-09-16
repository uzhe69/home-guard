import React from 'react';

import { AcSettings } from '@/components/ac-settings';
import { SettingsPage } from '@/components/settings-page';

export default function AcSettingsScreen() {
  return (
    <SettingsPage subtitle="Control detection thresholds, timing, and room calibration." title="AC monitoring">
      <AcSettings />
    </SettingsPage>
  );
}
