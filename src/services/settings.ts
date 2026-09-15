import * as SecureStore from 'expo-secure-store';

import { DEFAULT_SETTINGS } from '@/constants/demo';
import type { HomeSettings } from '@/types/home-guard';

const SETTINGS_KEY = 'home_guard.settings.v2';
const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

let memorySettings: HomeSettings | null = null;

function withDefaults(value: Partial<HomeSettings> | null): HomeSettings {
  const location = value?.homeLocation;

  return {
    ...DEFAULT_SETTINGS,
    ...value,
    kitchenInactivityMinutes:
      Number.isSafeInteger(value?.kitchenInactivityMinutes) && value!.kitchenInactivityMinutes! > 0
        ? value!.kitchenInactivityMinutes!
        : DEFAULT_SETTINGS.kitchenInactivityMinutes,
    stoveDepartureDelayMinutes:
      value?.stoveDepartureDelayMinutes === 2 || value?.stoveDepartureDelayMinutes === 3 || value?.stoveDepartureDelayMinutes === 5
        ? value.stoveDepartureDelayMinutes
        : DEFAULT_SETTINGS.stoveDepartureDelayMinutes,
    cookingTimerEndsAt:
      typeof value?.cookingTimerEndsAt === 'number' && Number.isFinite(value.cookingTimerEndsAt)
        ? value.cookingTimerEndsAt
        : null,
    phoneDepartedAt:
      typeof value?.phoneDepartedAt === 'number' && Number.isFinite(value.phoneDepartedAt)
        ? value.phoneDepartedAt
        : null,
    homeLocation:
      location &&
      Number.isFinite(location.latitude) &&
      Number.isFinite(location.longitude)
        ? location
        : DEFAULT_SETTINGS.homeLocation,
  };
}

async function canUseSecureStore() {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function loadSettings(): Promise<HomeSettings> {
  if (!(await canUseSecureStore())) {
    memorySettings ??= withDefaults(null);
    return memorySettings;
  }

  const storedValue = await SecureStore.getItemAsync(
    SETTINGS_KEY,
    secureStoreOptions,
  );

  if (!storedValue) {
    return withDefaults(null);
  }

  try {
    return withDefaults(JSON.parse(storedValue) as Partial<HomeSettings>);
  } catch {
    return withDefaults(null);
  }
}

export async function saveSettings(settings: HomeSettings): Promise<HomeSettings> {
  const nextSettings = withDefaults(settings);

  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(
      SETTINGS_KEY,
      JSON.stringify(nextSettings),
      secureStoreOptions,
    );
  } else {
    memorySettings = nextSettings;
  }

  return nextSettings;
}

export async function updateSettings(
  patch: Partial<HomeSettings>,
): Promise<HomeSettings> {
  const currentSettings = await loadSettings();
  return saveSettings({ ...currentSettings, ...patch });
}

export async function resetSettings(): Promise<HomeSettings> {
  memorySettings = null;

  if (await canUseSecureStore()) {
    await SecureStore.deleteItemAsync(SETTINGS_KEY, secureStoreOptions);
  }

  return withDefaults(null);
}
