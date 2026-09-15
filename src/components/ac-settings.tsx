import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { RangeInput } from '@/components/range-input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { learnedThermalTimeConstant } from '@/services/ac-monitoring';
import { useApp } from '@/state/app-provider';

export function AcSettings() {
  const { settings, patchSettings, acMonitoring, beginCalibration, cancelCalibration, isAway } = useApp();
  const [customTemperature, setCustomTemperature] = useState(false);
  const [customDelay, setCustomDelay] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [error, setError] = useState('');
  const showCustomTemperature = customTemperature || ![24, 25, 26].includes(settings.temperatureThresholdCelsius);
  const showCustomDelay = customDelay || ![20, 30, 45, 60, 90].includes(settings.reminderDelayMinutes);
  const tau = learnedThermalTimeConstant(acMonitoring);
  return (
    <View className="gap-5">
      <View>
        <Text className="mb-2 text-[14px] font-semibold text-ink">AC temperature threshold</Text>
        <SegmentedControl<number | string>
          value={showCustomTemperature ? 'custom' : settings.temperatureThresholdCelsius}
          segments={[{ label: '24°C', value: 24 }, { label: '25°C', value: 25 }, { label: '26°C', value: 26 }, { label: 'Custom', value: 'custom' }]}
          onChange={(temperature) => { setCustomTemperature(temperature === 'custom'); if (typeof temperature === 'number') void patchSettings({ temperatureThresholdCelsius: temperature }); }}
        />
        <Text className="mt-2 text-[12px] leading-5 text-slate">This is the measured room-temperature threshold below which the room may still be air-conditioned. It is not necessarily the temperature selected on your AC remote.</Text>
        {showCustomTemperature && <RangeInput label="Custom threshold (18–28°C, in 0.5°C steps)" minimum={18} maximum={28} step={0.5} value={settings.temperatureThresholdCelsius} onSave={(temperatureThresholdCelsius) => patchSettings({ temperatureThresholdCelsius })} />}
      </View>
      <View>
        <Text className="mb-2 text-[14px] font-semibold text-ink">AC reminder delay</Text>
        <Pressable accessibilityRole="radio" accessibilityState={{ checked: settings.acDelayMode === 'smart' }} onPress={() => void patchSettings({ acDelayMode: 'smart' })} className={`rounded-[17px] border p-4 ${settings.acDelayMode === 'smart' ? 'border-primary bg-mint' : 'border-line bg-white'}`}>
          <Text className="text-[15px] font-semibold text-primary">Smart delay — Recommended</Text>
          <Text className="mt-1 text-[12px] leading-5 text-slate">Starts checking after 20 minutes. Uses the room’s trend and nearby outdoor air to distinguish residual cooling from an AC still running.</Text>
        </Pressable>
        <Text className="mb-2 mt-3 text-[12px] text-slate">Or choose a fixed delay (30 minutes by default)</Text>
        <View className="flex-row flex-wrap gap-2">
          {[20, 30, 45, 60, 90].map((minutes) => {
            const selected = settings.acDelayMode === 'fixed' && !showCustomDelay && settings.reminderDelayMinutes === minutes;
            return <Pressable key={minutes} accessibilityRole="radio" accessibilityState={{ checked: selected }} className={`rounded-[14px] border px-4 py-3 ${selected ? 'border-primary bg-mint' : 'border-line bg-white'}`} onPress={() => { setCustomDelay(false); void patchSettings({ acDelayMode: 'fixed', reminderDelayMinutes: minutes }); }}><Text className="text-[13px] font-semibold text-primary">{minutes} min</Text></Pressable>;
          })}
          <Pressable accessibilityRole="radio" accessibilityState={{ checked: settings.acDelayMode === 'fixed' && showCustomDelay }} className={`rounded-[14px] border px-4 py-3 ${settings.acDelayMode === 'fixed' && showCustomDelay ? 'border-primary bg-mint' : 'border-line bg-white'}`} onPress={() => { setCustomDelay(true); void patchSettings({ acDelayMode: 'fixed' }); }}><Text className="text-[13px] font-semibold text-primary">Custom</Text></Pressable>
        </View>
        {settings.acDelayMode === 'fixed' && showCustomDelay && <RangeInput label="Custom delay (20–120 whole minutes)" minimum={20} maximum={120} value={settings.reminderDelayMinutes} onSave={(reminderDelayMinutes) => patchSettings({ acDelayMode: 'fixed', reminderDelayMinutes })} />}
        <Text className="mt-2 text-[12px] leading-5 text-slate">Fresh readings are checked before an alert. Returning home cancels the pending check. No AC delay below 20 minutes is allowed.</Text>
      </View>
      <Card className="gap-3 p-4">
        <Text className="text-[15px] font-semibold text-ink">Optional home calibration</Text>
        <Text className="text-[12px] leading-5 text-slate">Switch off your AC, then start observing how this room naturally warms. Keep ventilation unchanged. Allow at least 20 minutes per event; repeat on separate shut-offs to learn your room’s warming rate.</Text>
        <Text className="text-[12px] leading-5 text-slate">HDB flats, condos and landed homes differ in room size, walls, ventilation, sun exposure and thermal mass. Calibration helps Smart delay account for your home.</Text>
        {tau !== null && <Text className="text-[13px] font-semibold text-primary">Learned thermal time constant: {Math.round(tau)} min · {acMonitoring.thermalTimeConstantsMinutes.length} events</Text>}
        {!!acMonitoring.calibrationMessage && <Text className="text-[12px] leading-5 text-slate">{acMonitoring.calibrationMessage}</Text>}
        {!!error && <Text accessibilityRole="alert" className="text-[12px] text-ember">{error}</Text>}
        <Button label={acMonitoring.calibration ? 'Cancel calibration' : 'AC is off — Start calibration'} disabled={isAway} loading={calibrating} variant="secondary" onPress={async () => {
          setCalibrating(true); setError('');
          try { if (acMonitoring.calibration) await cancelCalibration(); else await beginCalibration(); }
          catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to start calibration.'); }
          finally { setCalibrating(false); }
        }} />
      </Card>
    </View>
  );
}
