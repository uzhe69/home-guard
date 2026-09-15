import React, { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';

export function DurationInput({
  value,
  label,
  submitLabel,
  onSave,
}: {
  value: number;
  label: string;
  submitLabel: string;
  onSave: (minutes: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(String(value)), [value]);

  return (
    <View className="gap-3">
      <Text className="text-[13px] text-slate">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        className="rounded-[14px] border border-line bg-white px-4 py-3 text-[16px] text-ink"
        keyboardType="number-pad"
        onChangeText={(text) => { setDraft(text); setError(null); }}
        placeholder="Minutes"
        value={draft}
      />
      {error && <Text accessibilityRole="alert" className="text-[12px] text-ember">{error}</Text>}
      <Button
        label={submitLabel}
        loading={saving}
        onPress={async () => {
          const minutes = Number(draft.trim());
          if (!/^\d+$/.test(draft.trim()) || !Number.isSafeInteger(minutes) || minutes <= 0 || !Number.isSafeInteger(Date.now() + minutes * 60_000)) {
            setError('Enter a positive whole number of minutes.');
            return;
          }
          setSaving(true);
          try { await onSave(minutes); }
          finally { setSaving(false); }
        }}
        variant="stoveSecondary"
      />
    </View>
  );
}
