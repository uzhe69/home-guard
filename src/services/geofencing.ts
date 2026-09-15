import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { getStoveSnapshot } from '@/services/firebase';
import { beginAcDeparture, cancelAcDeparture, evaluateAcMonitoring, loadAcMonitoringState } from '@/services/ac-monitoring';
import { cancelStoveReminders, scheduleStoveReminder } from '@/services/notifications';
import { distanceMeters } from '@/services/outdoor-temperature';
import { loadSettings, updateSettings } from '@/services/settings';
import type { HomeSettings, StoveDeviceSnapshot } from '@/types/home-guard';

export const HOME_GEOFENCE_TASK = 'home-guard-geofence';
export const AC_MONITORING_TASK = 'home-guard-ac-monitoring';
const HOME_REGION_IDENTIFIER = 'home-guard-home';
const scheduledDepartureByDevice = new Map<string, number>();
const presenceListeners = new Set<(departedAt: number | null) => void>();

export function subscribeToHomePresence(listener: (departedAt: number | null) => void) {
  presenceListeners.add(listener);
  return () => { presenceListeners.delete(listener); };
}

export async function processReturnHome(settings?: HomeSettings) {
  const activeSettings = settings ?? (await loadSettings());
  await updateSettings({ phoneDepartedAt: null });
  presenceListeners.forEach((listener) => listener(null));
  await cancelAcDeparture();
  await stopAcBackgroundMonitoring();
  await cancelStoveReminders(activeSettings.stoveDeviceId, 'away');
  scheduledDepartureByDevice.delete(activeSettings.stoveDeviceId);
}

export async function reconcileStoveDeparture(stove: StoveDeviceSnapshot, settings: HomeSettings): Promise<string | null> {
  if (!settings.notificationsEnabled || !stove.isHot || settings.phoneDepartedAt === null) {
    await cancelStoveReminders(stove.deviceId, 'away');
    scheduledDepartureByDevice.delete(stove.deviceId);
    return null;
  }
  const alertAt = settings.phoneDepartedAt + settings.stoveDepartureDelayMinutes * 60_000;
  if (scheduledDepartureByDevice.get(stove.deviceId) === alertAt) return null;
  await cancelStoveReminders(stove.deviceId, 'away');
  const id = await scheduleStoveReminder({
    deviceId: stove.deviceId,
    reason: 'away',
    delayMinutes: Math.max(0, (alertAt - Date.now()) / 60_000),
  });
  scheduledDepartureByDevice.set(stove.deviceId, alertAt);
  return id;
}

type GeofencingTaskData = {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
};

export async function processDeparture(
  settings?: HomeSettings,
): Promise<string[]> {
  const previousSettings = settings ?? (await loadSettings());
  const activeSettings = await updateSettings({ phoneDepartedAt: previousSettings.phoneDepartedAt ?? Date.now() });
  presenceListeners.forEach((listener) => listener(activeSettings.phoneDepartedAt));
  await beginAcDeparture(activeSettings);
  if (activeSettings.notificationsEnabled) await startAcBackgroundMonitoring().catch(() => undefined);
  if (!activeSettings.notificationsEnabled) {
    return [];
  }

  const stove = await getStoveSnapshot(activeSettings.stoveDeviceId);
  const reminders: Promise<string>[] = [];

  const stoveReminder = await reconcileStoveDeparture(stove, activeSettings);
  if (stoveReminder) reminders.push(Promise.resolve(stoveReminder));

  return Promise.all(reminders);
}

if (!TaskManager.isTaskDefined(AC_MONITORING_TASK)) {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(AC_MONITORING_TASK, async ({ data, error }) => {
    if (error || !data) return;
    const settings = await loadSettings();
    const location = data.locations.at(-1);
    if (settings.phoneDepartedAt !== null && settings.homeLocation && location && Date.now() - location.timestamp < 2 * 60_000 && location.coords.accuracy !== null && distanceMeters(settings.homeLocation, location.coords) + location.coords.accuracy <= settings.radiusMeters) {
      await processReturnHome(settings);
      return;
    }
    const state = await evaluateAcMonitoring();
    if ((!state.departure || state.departure.alertSent || !settings.notificationsEnabled) && !state.calibration) await stopAcBackgroundMonitoring();
  });
}

export async function startAcBackgroundMonitoring() {
  if (!(await Location.getBackgroundPermissionsAsync()).granted) return;
  if (await Location.hasStartedLocationUpdatesAsync(AC_MONITORING_TASK)) return;
  await Location.startLocationUpdatesAsync(AC_MONITORING_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 0,
    timeInterval: 60_000,
    deferredUpdatesInterval: 60_000,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Home Guard is checking your room',
      notificationBody: 'Watching for residual cooling and AC temperature trends.',
    },
  });
}

export async function stopAcBackgroundMonitoring() {
  if (await Location.hasStartedLocationUpdatesAsync(AC_MONITORING_TASK)) await Location.stopLocationUpdatesAsync(AC_MONITORING_TASK);
}

if (!TaskManager.isTaskDefined(HOME_GEOFENCE_TASK)) {
  TaskManager.defineTask<GeofencingTaskData>(
    HOME_GEOFENCE_TASK,
    async ({ data, error }) => {
      if (error || !data) return;
      if (data.eventType === Location.GeofencingEventType.Exit) await processDeparture();
      if (data.eventType === Location.GeofencingEventType.Enter) await processReturnHome();
    },
  );
}

export async function requestGeofencingPermissions(): Promise<boolean> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) {
    return false;
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  return background.granted;
}

export async function startHomeGeofence(settings?: HomeSettings): Promise<void> {
  const activeSettings = settings ?? (await loadSettings());
  if (!activeSettings.homeLocation) {
    throw new Error('Set a home location before enabling geofencing.');
  }

  if (!(await requestGeofencingPermissions())) {
    throw new Error('Always Allow location permission is required for geofencing.');
  }

  await Location.startGeofencingAsync(HOME_GEOFENCE_TASK, [
    {
      identifier: HOME_REGION_IDENTIFIER,
      ...activeSettings.homeLocation,
      radius: activeSettings.radiusMeters,
      notifyOnEnter: true,
      notifyOnExit: true,
    },
  ]);
  const monitoring = await loadAcMonitoringState();
  if ((activeSettings.phoneDepartedAt !== null && activeSettings.notificationsEnabled && !monitoring.departure?.alertSent) || monitoring.calibration) await startAcBackgroundMonitoring();
  else await stopAcBackgroundMonitoring();
}

export async function stopHomeGeofence(): Promise<void> {
  await stopAcBackgroundMonitoring();
  if (await Location.hasStartedGeofencingAsync(HOME_GEOFENCE_TASK)) {
    await Location.stopGeofencingAsync(HOME_GEOFENCE_TASK);
  }
}

export function isHomeGeofenceActive(): Promise<boolean> {
  return Location.hasStartedGeofencingAsync(HOME_GEOFENCE_TASK);
}

export function simulateLeavingHome(settings?: HomeSettings) {
  return processDeparture(settings);
}
