import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_SETTINGS,
  DEMO_AC_SNAPSHOT,
  DEMO_GAS_FLOW_HISTORY,
  DEMO_STOVE_SNAPSHOT,
  DEMO_TEMPERATURE_HISTORY,
} from '@/constants/demo';
import {
  ensureAnonymousSession,
  getDeviceSnapshot,
  getFirebaseMode,
  getStoveSnapshot,
  sendTurnOffCommand,
  setMockStoveState,
  setMockTemperature,
  subscribeToDevice,
  subscribeToStoveDevice,
} from '@/services/firebase';
import { simulateLeavingHome, startHomeGeofence, stopHomeGeofence } from '@/services/geofencing';
import {
  addNotificationActionListener,
  configureNotifications,
  processLastNotificationResponse,
  sendAcReminderNow,
  scheduleStoveReminder,
} from '@/services/notifications';
import { loadSettings, resetSettings, saveSettings } from '@/services/settings';
import {
  getKitchenInactivityMinutes,
  getStoveRisk,
  processKitchenInactivity,
  type StoveRisk,
} from '@/services/stove-monitoring';
import type { AcDeviceSnapshot, HomeSettings, StoveDeviceSnapshot } from '@/types/home-guard';

type AppContextValue = {
  ready: boolean;
  settings: HomeSettings;
  temperature: number;
  temperatureHistory: number[];
  connectionStatus: AcDeviceSnapshot['connectionStatus'];
  lastCommandLabel: string;
  lastUpdatedLabel: string;
  stove: StoveDeviceSnapshot;
  stoveGasHistory: number[];
  stoveInactiveMinutes: number;
  stoveLastMotionLabel: string;
  stoveLastUpdatedLabel: string;
  stoveRisk: StoveRisk;
  firebaseMode: 'live' | 'mock';
  isAway: boolean;
  patchSettings: (patch: Partial<HomeSettings>) => Promise<void>;
  finishSetup: (patch: Partial<HomeSettings>) => Promise<void>;
  refreshDevice: () => Promise<void>;
  refreshStove: () => Promise<void>;
  turnOff: () => Promise<void>;
  turnOffStove: () => Promise<void>;
  simulateLeaving: () => Promise<void>;
  simulateTemperature: (temperature: number) => Promise<void>;
  simulateStove: (scenario: 'active' | 'inactive' | 'off') => Promise<void>;
  sendTestReminder: () => Promise<void>;
  sendTestStoveReminder: () => Promise<void>;
  resetDemo: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

function relativeTime(timestamp: number, nowLabel: string) {
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return nowLabel;
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} hr ago`;
}

export function AppProvider({ children }: React.PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<HomeSettings>(DEFAULT_SETTINGS);
  const [device, setDevice] = useState<AcDeviceSnapshot>(DEMO_AC_SNAPSHOT);
  const [stove, setStove] = useState<StoveDeviceSnapshot>(DEMO_STOVE_SNAPSHOT);
  const [temperatureHistory, setTemperatureHistory] = useState<number[]>([...DEMO_TEMPERATURE_HISTORY]);
  const [stoveGasHistory, setStoveGasHistory] = useState<number[]>([...DEMO_GAS_FLOW_HISTORY]);
  const [isAway, setIsAway] = useState(false);

  useEffect(() => {
    void Promise.all([loadSettings(), ensureAnonymousSession()])
      .then(([storedSettings]) => setSettings(storedSettings))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToDevice(settings.acDeviceId, (snapshot) => {
      setDevice(snapshot);
      setTemperatureHistory((history) => {
        if (history.at(-1) === snapshot.roomTemperatureCelsius) return history;
        return [...history.slice(-11), snapshot.roomTemperatureCelsius];
      });
    });
    return unsubscribe;
  }, [settings.acDeviceId]);

  useEffect(() => {
    const unsubscribe = subscribeToStoveDevice(settings.stoveDeviceId, (snapshot) => {
      setStove(snapshot);
      setStoveGasHistory((history) => {
        if (history.at(-1) === snapshot.gasFlowLitersPerMinute) return history;
        return [...history.slice(-11), snapshot.gasFlowLitersPerMinute];
      });
    });
    return unsubscribe;
  }, [settings.stoveDeviceId]);

  useEffect(() => {
    const subscription = addNotificationActionListener((result) => {
      if (result.action === 'turn_off' && result.deviceType !== 'stove') setIsAway(false);
    });
    if (settings.setupComplete && settings.notificationsEnabled) {
      void configureNotifications();
      void processLastNotificationResponse();
    }
    return () => subscription.remove();
  }, [settings.notificationsEnabled, settings.setupComplete]);

  useEffect(() => {
    if (!settings.setupComplete || !settings.notificationsEnabled) return;

    const checkInactivity = () => {
      void processKitchenInactivity(stove, settings);
    };
    checkInactivity();
    const interval = setInterval(checkInactivity, 60_000);
    return () => clearInterval(interval);
  }, [settings, stove]);

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
    setDevice(await getDeviceSnapshot(settings.acDeviceId));
  }, [settings.acDeviceId]);

  const refreshStove = useCallback(async () => {
    setStove(await getStoveSnapshot(settings.stoveDeviceId));
  }, [settings.stoveDeviceId]);

  const turnOff = useCallback(async () => {
    await sendTurnOffCommand(settings.acDeviceId, 'app', 'ac');
    setIsAway(false);
  }, [settings.acDeviceId]);

  const turnOffStove = useCallback(async () => {
    await sendTurnOffCommand(settings.stoveDeviceId, 'app', 'stove');
  }, [settings.stoveDeviceId]);

  const simulateLeaving = useCallback(async () => {
    setIsAway(true);
    await simulateLeavingHome(settings);
  }, [settings]);

  const simulateTemperature = useCallback(async (temperature: number) => {
    setDevice(await setMockTemperature(temperature));
  }, []);

  const simulateStove = useCallback(
    async (scenario: 'active' | 'inactive' | 'off') => {
      const lastMotionAt =
        scenario === 'inactive'
          ? Date.now() - (settings.kitchenInactivityMinutes + 5) * 60_000
          : Date.now();
      const snapshot = await setMockStoveState(
        settings.stoveDeviceId,
        scenario !== 'off',
        lastMotionAt,
      );
      setStove(snapshot);
    },
    [settings.kitchenInactivityMinutes, settings.stoveDeviceId],
  );

  const sendTestReminder = useCallback(async () => {
    await configureNotifications();
    await sendAcReminderNow({
      temperatureCelsius: device.roomTemperatureCelsius,
      deviceId: settings.acDeviceId,
    });
  }, [device.roomTemperatureCelsius, settings.acDeviceId]);

  const sendTestStoveReminder = useCallback(async () => {
    await configureNotifications();
    await scheduleStoveReminder({
      deviceId: settings.stoveDeviceId,
      reason: 'inactivity',
      inactiveMinutes: Math.max(
        settings.kitchenInactivityMinutes,
        getKitchenInactivityMinutes(stove),
      ),
    });
  }, [settings.kitchenInactivityMinutes, settings.stoveDeviceId, stove]);

  const resetDemo = useCallback(async () => {
    await stopHomeGeofence();
    const defaults = await resetSettings();
    setSettings(defaults);
    setDevice(DEMO_AC_SNAPSHOT);
    setStove(DEMO_STOVE_SNAPSHOT);
    setTemperatureHistory([...DEMO_TEMPERATURE_HISTORY]);
    setStoveGasHistory([...DEMO_GAS_FLOW_HISTORY]);
    setIsAway(false);
  }, []);

  const stoveInactiveMinutes = getKitchenInactivityMinutes(stove);
  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      settings,
      temperature: device.roomTemperatureCelsius,
      temperatureHistory,
      connectionStatus: device.connectionStatus,
      lastCommandLabel: device.lastCommand?.value === 'OFF' ? 'Turned off' : 'AC is on',
      lastUpdatedLabel: relativeTime(device.lastSeenAt, 'updated now'),
      stove,
      stoveGasHistory,
      stoveInactiveMinutes,
      stoveLastMotionLabel: relativeTime(stove.lastMotionAt, 'motion now'),
      stoveLastUpdatedLabel: relativeTime(stove.lastSeenAt, 'updated now'),
      stoveRisk: getStoveRisk(stove, settings.kitchenInactivityMinutes, isAway),
      firebaseMode: getFirebaseMode(),
      isAway,
      patchSettings,
      finishSetup,
      refreshDevice,
      refreshStove,
      turnOff,
      turnOffStove,
      simulateLeaving,
      simulateTemperature,
      simulateStove,
      sendTestReminder,
      sendTestStoveReminder,
      resetDemo,
    }),
    [
      device,
      finishSetup,
      isAway,
      patchSettings,
      ready,
      refreshDevice,
      refreshStove,
      resetDemo,
      sendTestReminder,
      sendTestStoveReminder,
      settings,
      simulateLeaving,
      simulateStove,
      simulateTemperature,
      stove,
      stoveGasHistory,
      stoveInactiveMinutes,
      temperatureHistory,
      turnOff,
      turnOffStove,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used within AppProvider.');
  return value;
}
