import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { getRoomTemperature } from '@/services/firebase';
import { scheduleAcReminder } from '@/services/notifications';
import { loadSettings } from '@/services/settings';
import type { HomeSettings } from '@/types/ac-guard';

export const HOME_GEOFENCE_TASK = 'ac-guard-home-geofence';
const HOME_REGION_IDENTIFIER = 'ac-guard-home';

type GeofencingTaskData = {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
};

export async function processDeparture(
  settings?: HomeSettings,
): Promise<string | null> {
  const activeSettings = settings ?? (await loadSettings());
  if (!activeSettings.notificationsEnabled) {
    return null;
  }

  const temperatureCelsius = await getRoomTemperature(activeSettings.deviceId);
  if (temperatureCelsius >= activeSettings.temperatureThresholdCelsius) {
    return null;
  }

  return scheduleAcReminder({
    temperatureCelsius,
    deviceId: activeSettings.deviceId,
    delayMinutes: activeSettings.reminderDelayMinutes,
  });
}

if (!TaskManager.isTaskDefined(HOME_GEOFENCE_TASK)) {
  TaskManager.defineTask<GeofencingTaskData>(
    HOME_GEOFENCE_TASK,
    async ({ data, error }) => {
      if (error || data?.eventType !== Location.GeofencingEventType.Exit) {
        return;
      }

      await processDeparture();
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
      notifyOnEnter: false,
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
