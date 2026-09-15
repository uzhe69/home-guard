import { AppState } from 'react-native';
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
import { processReturnHome, reconcileStoveDeparture, simulateLeavingHome, startAcBackgroundMonitoring, startHomeGeofence, stopHomeGeofence, subscribeToHomePresence } from '@/services/geofencing';
import { emptyAcMonitoringState, evaluateAcMonitoring, loadAcMonitoringState, recordAcReading, resetAcMonitoring, startAcCalibration, stopAcCalibration, subscribeToAcMonitoring } from '@/services/ac-monitoring';
import {
  addNotificationActionListener,
  configureNotifications,
  processLastNotificationResponse,
  sendAcReminderNow,
  cancelStoveReminders,
  cancelAcReminders,
  scheduleStoveReminder,
} from '@/services/notifications';
import { loadSettings, resetSettings, updateSettings } from '@/services/settings';
import {
  getKitchenInactivityMinutes,
  getStoveRisk,
  processKitchenInactivity,
  type StoveRisk,
} from '@/services/stove-monitoring';
import type { AcDeviceSnapshot, AcMonitoringState, HomeSettings, StoveDeviceSnapshot } from '@/types/home-guard';

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
  acMonitoring: AcMonitoringState;
  beginCalibration: () => Promise<void>;
  cancelCalibration: () => Promise<void>;
  patchSettings: (patch: Partial<HomeSettings>) => Promise<void>;
  finishSetup: (patch: Partial<HomeSettings>) => Promise<void>;
  refreshDevice: () => Promise<void>;
  refreshStove: () => Promise<void>;
  turnOff: () => Promise<void>;
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
  const [now, setNow] = useState(Date.now());
  const [acMonitoring, setAcMonitoring] = useState<AcMonitoringState>(emptyAcMonitoringState);
  const isAway = settings.phoneDepartedAt !== null;

  useEffect(() => {
    const unsubscribe = subscribeToAcMonitoring(setAcMonitoring);
    void loadAcMonitoringState().then(setAcMonitoring);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToHomePresence((phoneDepartedAt) => setSettings((current) => ({ ...current, phoneDepartedAt })));
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setNow(Date.now());
        void loadSettings().then(setSettings);
      }
    });
    const interval = setInterval(() => setNow(Date.now()), 15_000);
    return () => { unsubscribe(); subscription.remove(); clearInterval(interval); };
  }, []);

  useEffect(() => {
    void Promise.all([loadSettings(), ensureAnonymousSession()])
      .then(([storedSettings]) => setSettings(storedSettings))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToDevice(settings.acDeviceId, (snapshot) => {
      setDevice(snapshot);
      if (ready) void recordAcReading(snapshot);
      setTemperatureHistory((history) => {
        if (!Number.isFinite(snapshot.roomTemperatureCelsius) || history.at(-1) === snapshot.roomTemperatureCelsius) return history;
        return [...history.slice(-11), snapshot.roomTemperatureCelsius];
      });
    });
    return unsubscribe;
  }, [ready, settings.acDeviceId]);

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
      if (result.action === 'opened' && result.deviceType === 'stove') void getStoveSnapshot(settings.stoveDeviceId).then(setStove);
    });
    if (settings.setupComplete && settings.notificationsEnabled) {
      void configureNotifications();
      void processLastNotificationResponse();
    }
    return () => subscription.remove();
  }, [settings.notificationsEnabled, settings.setupComplete, settings.stoveDeviceId]);

  useEffect(() => {
    if (!ready || !settings.setupComplete) return;

    const checkInactivity = () => {
      void processKitchenInactivity(stove, settings);
      void reconcileStoveDeparture(stove, settings);
    };
    checkInactivity();
    const interval = setInterval(checkInactivity, 60_000);
    return () => clearInterval(interval);
  }, [ready, settings, stove]);

  const patchSettings = useCallback(
    async (patch: Partial<HomeSettings>) => {
      const next = await updateSettings(patch);
      setSettings(next);
      if (patch.acDeviceId && patch.acDeviceId !== settings.acDeviceId) await resetAcMonitoring();
      if (patch.homeLocation) await processReturnHome(next);
      if (patch.notificationsEnabled === false) await cancelAcReminders();
      if (next.setupComplete && next.homeLocation) {
        void startHomeGeofence(next).catch(() => undefined);
      }
    },
    [settings.acDeviceId],
  );

  useEffect(() => {
    if (!ready) return;
    void loadSettings().then((current) => {
      if (current.setupComplete && current.homeLocation) void startHomeGeofence(current).catch(() => undefined);
    });
  }, [ready]);

  useEffect(() => {
    if (ready && !stove.isHot && settings.cookingTimerEndsAt !== null) {
      void patchSettings({ cookingTimerEndsAt: null });
    }
  }, [ready, stove.isHot, settings.cookingTimerEndsAt, patchSettings]);

  const finishSetup = useCallback(
    async (patch: Partial<HomeSettings>) => {
      const next = await updateSettings({ ...patch, setupComplete: true });
      setSettings(next);
      if (next.notificationsEnabled) await configureNotifications();
      if (next.homeLocation) await startHomeGeofence(next).catch(() => undefined);
    },
    [settings],
  );

  const refreshDevice = useCallback(async () => {
    setDevice(await getDeviceSnapshot(settings.acDeviceId));
    await evaluateAcMonitoring();
  }, [settings.acDeviceId]);

  const refreshStove = useCallback(async () => {
    setStove(await getStoveSnapshot(settings.stoveDeviceId));
  }, [settings.stoveDeviceId]);

  const turnOff = useCallback(async () => {
    await sendTurnOffCommand(settings.acDeviceId, 'app', 'ac');
  }, [settings.acDeviceId]);

  const simulateLeaving = useCallback(async () => {
    await simulateLeavingHome(settings);
    setSettings(await loadSettings());
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
    await processReturnHome(settings);
    await resetAcMonitoring();
    await cancelStoveReminders(settings.stoveDeviceId);
    await processKitchenInactivity(stove, { ...settings, notificationsEnabled: false });
    const defaults = await resetSettings();
    setSettings(defaults);
    setDevice(DEMO_AC_SNAPSHOT);
    setStove(DEMO_STOVE_SNAPSHOT);
    setTemperatureHistory([...DEMO_TEMPERATURE_HISTORY]);
    setStoveGasHistory([...DEMO_GAS_FLOW_HISTORY]);
  }, [settings, stove]);

  useEffect(() => {
    if (!ready) return;
    const check = () => {
      if (AppState.currentState === 'active') void evaluateAcMonitoring().catch(() => undefined);
    };
    check();
    const interval = setInterval(check, 60_000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') check(); });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [ready]);

  const beginCalibration = useCallback(async () => {
    await startAcCalibration();
    await startAcBackgroundMonitoring().catch(() => undefined);
  }, []);
  const cancelCalibration = useCallback(async () => { await stopAcCalibration(); }, []);

  const stoveInactiveMinutes = getKitchenInactivityMinutes(stove, now);
  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      settings,
      temperature: device.roomTemperatureCelsius,
      temperatureHistory,
      connectionStatus: device.connectionStatus,
      lastCommandLabel: device.lastCommand ? `${device.lastCommand.value} requested` : 'No command',
      lastUpdatedLabel: relativeTime(device.lastSeenAt, 'updated now'),
      stove,
      stoveGasHistory,
      stoveInactiveMinutes,
      stoveLastMotionLabel: relativeTime(stove.lastMotionAt, 'motion now'),
      stoveLastUpdatedLabel: relativeTime(stove.lastSeenAt, 'updated now'),
      stoveRisk: getStoveRisk(stove, settings, now),
      firebaseMode: getFirebaseMode(),
      isAway,
      acMonitoring,
      beginCalibration,
      cancelCalibration,
      patchSettings,
      finishSetup,
      refreshDevice,
      refreshStove,
      turnOff,
      simulateLeaving,
      simulateTemperature,
      simulateStove,
      sendTestReminder,
      sendTestStoveReminder,
      resetDemo,
    }),
    [
      device,
      acMonitoring,
      beginCalibration,
      cancelCalibration,
      now,
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
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used within AppProvider.');
  return value;
}
