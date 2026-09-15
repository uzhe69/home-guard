import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { getRoomTemperature, getStoveSnapshot } from '@/services/firebase';
import { cancelStoveReminders, scheduleAcReminder, scheduleStoveReminder } from '@/services/notifications';
import { loadSettings, updateSettings } from '@/services/settings';
import type { HomeSettings, StoveDeviceSnapshot } from '@/types/home-guard';

export const HOME_GEOFENCE_TASK = 'home-guard-geofence';
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
  if (!activeSettings.notificationsEnabled) {
    return [];
  }

  const [temperatureCelsius, stove] = await Promise.all([
    getRoomTemperature(activeSettings.acDeviceId),
    getStoveSnapshot(activeSettings.stoveDeviceId),
  ]);
  const reminders: Promise<string>[] = [];

  if (temperatureCelsius < activeSettings.temperatureThresholdCelsius) {
    reminders.push(
      scheduleAcReminder({
        temperatureCelsius,
        deviceId: activeSettings.acDeviceId,
        delayMinutes: activeSettings.reminderDelayMinutes,
      }),
    );
  }

  const stoveReminder = await reconcileStoveDeparture(stove, activeSettings);
  if (stoveReminder) reminders.push(Promise.resolve(stoveReminder));

  return Promise.all(reminders);
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
}

export async function stopHomeGeofence(): Promise<void> {
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
