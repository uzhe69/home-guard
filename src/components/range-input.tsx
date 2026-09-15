import React, { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';

export function RangeInput({ value, label, minimum, maximum, step = 1, onSave }: {
  value: number;
  label: string;
  minimum: number;
  maximum?: number;
  step?: number;
  onSave: (value: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <View className="mt-3 gap-3">
      <Text className="text-[13px] text-slate">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        className="rounded-[14px] border border-line bg-white px-4 py-3 text-[16px] text-ink"
        keyboardType={step < 1 ? 'decimal-pad' : 'number-pad'}
        value={draft}
        onChangeText={(text) => { setDraft(text); setError(''); }}
      />
      {!!error && <Text accessibilityRole="alert" className="text-[12px] text-ember">{error}</Text>}
      <Button label="Save" loading={saving} variant="secondary" onPress={async () => {
        const number = Number(draft.trim());
        if (!/^\d+(\.\d+)?$/.test(draft.trim()) || !Number.isFinite(number) || number < minimum || (maximum !== undefined && number > maximum) || !Number.isInteger(number / step)) {
          setError(maximum === undefined ? `Enter a whole number of at least ${minimum}.` : `Enter ${minimum}–${maximum} in ${step === 1 ? 'whole-number' : String(step)} increments.`);
          return;
        }
        setSaving(true);
        try { await onSave(number); }
        catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save. Please try again.'); }
        finally { setSaving(false); }
      }} />
    </View>
  );
}
