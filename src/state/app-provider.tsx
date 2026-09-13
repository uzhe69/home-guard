import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { DEFAULT_SETTINGS, DEMO_DEVICE_SNAPSHOT, DEMO_TEMPERATURE_HISTORY } from '@/constants/demo';
import {
  ensureAnonymousSession,
  getDeviceSnapshot,
  getFirebaseMode,
  sendTurnOffCommand,
  setMockTemperature,
  subscribeToDevice,
} from '@/services/firebase';
import { simulateLeavingHome, startHomeGeofence, stopHomeGeofence } from '@/services/geofencing';
import {
  addNotificationActionListener,
  configureNotifications,
  processLastNotificationResponse,
  sendAcReminderNow,
} from '@/services/notifications';
import { loadSettings, resetSettings, saveSettings } from '@/services/settings';
import type { DeviceSnapshot, HomeSettings } from '@/types/home-guard';

type AppContextValue = {
  ready: boolean;
  settings: HomeSettings;
  temperature: number;
  temperatureHistory: number[];
  connectionStatus: DeviceSnapshot['connectionStatus'];
  lastCommandLabel: string;
  lastUpdatedLabel: string;
  firebaseMode: 'live' | 'mock';
  isAway: boolean;
  patchSettings: (patch: Partial<HomeSettings>) => Promise<void>;
  finishSetup: (patch: Partial<HomeSettings>) => Promise<void>;
  refreshDevice: () => Promise<void>;
  turnOff: () => Promise<void>;
  simulateLeaving: () => Promise<void>;
  simulateTemperature: (temperature: number) => Promise<void>;
  sendTestReminder: () => Promise<void>;
  resetDemo: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

function relativeTime(timestamp: number) {
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return 'updated now';
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} hr ago`;
}

export function AppProvider({ children }: React.PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<HomeSettings>(DEFAULT_SETTINGS);
  const [device, setDevice] = useState<DeviceSnapshot>(DEMO_DEVICE_SNAPSHOT);
  const [temperatureHistory, setTemperatureHistory] = useState<number[]>([...DEMO_TEMPERATURE_HISTORY]);
  const [isAway, setIsAway] = useState(false);

  useEffect(() => {
    void Promise.all([loadSettings(), ensureAnonymousSession()])
      .then(([storedSettings]) => setSettings(storedSettings))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToDevice(settings.deviceId, (snapshot) => {
      setDevice(snapshot);
      setTemperatureHistory((history) => {
        if (history.at(-1) === snapshot.roomTemperatureCelsius) return history;
        return [...history.slice(-11), snapshot.roomTemperatureCelsius];
      });
    });
    return unsubscribe;
  }, [settings.deviceId]);

  useEffect(() => {
    const subscription = addNotificationActionListener((result) => {
      if (result.action === 'turn_off') setIsAway(false);
    });
    if (settings.setupComplete && settings.notificationsEnabled) {
      void configureNotifications();
      void processLastNotificationResponse();
    }
    return () => subscription.remove();
  }, [settings.notificationsEnabled, settings.setupComplete]);

  const patchSettings = useCallback(
    async (patch: Partial<HomeSettings>) => {
      const next = await saveSettings({ ...settings, ...patch });
      setSettings(next);
      if (next.setupComplete && next.homeLocation) {
        void startHomeGeofence(next).catch(() => undefined);
      }
    },
    [settings],
  );

  const finishSetup = useCallback(
    async (patch: Partial<HomeSettings>) => {
      const next = await saveSettings({ ...settings, ...patch, setupComplete: true });
      setSettings(next);
      if (next.notificationsEnabled) await configureNotifications();
      if (next.homeLocation) await startHomeGeofence(next).catch(() => undefined);
    },
    [settings],
  );

  const refreshDevice = useCallback(async () => {
    setDevice(await getDeviceSnapshot(settings.deviceId));
  }, [settings.deviceId]);

  const turnOff = useCallback(async () => {
    await sendTurnOffCommand(settings.deviceId, 'app');
    setIsAway(false);
  }, [settings.deviceId]);

  const simulateLeaving = useCallback(async () => {
    setIsAway(true);
    await simulateLeavingHome(settings);
  }, [settings]);

  const simulateTemperature = useCallback(async (temperature: number) => {
    const snapshot = await setMockTemperature(temperature);
    setDevice(snapshot);
  }, []);

  const sendTestReminder = useCallback(async () => {
    await configureNotifications();
    await sendAcReminderNow({
      temperatureCelsius: device.roomTemperatureCelsius,
      deviceId: settings.deviceId,
    });
  }, [device.roomTemperatureCelsius, settings.deviceId]);

  const resetDemo = useCallback(async () => {
    await stopHomeGeofence();
    const defaults = await resetSettings();
    setSettings(defaults);
    setDevice(DEMO_DEVICE_SNAPSHOT);
    setTemperatureHistory([...DEMO_TEMPERATURE_HISTORY]);
    setIsAway(false);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      settings,
      temperature: device.roomTemperatureCelsius,
      temperatureHistory,
      connectionStatus: device.connectionStatus,
      lastCommandLabel: device.lastCommand?.value === 'OFF' ? 'Turned off' : 'AC is on',
      lastUpdatedLabel: relativeTime(device.lastSeenAt),
      firebaseMode: getFirebaseMode(),
      isAway,
      patchSettings,
      finishSetup,
      refreshDevice,
      turnOff,
      simulateLeaving,
      simulateTemperature,
      sendTestReminder,
      resetDemo,
    }),
    [device, finishSetup, isAway, patchSettings, ready, refreshDevice, resetDemo, sendTestReminder, settings, simulateLeaving, simulateTemperature, temperatureHistory, turnOff],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used within AppProvider.');
  return value;
}
