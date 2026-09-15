import { getStoveSnapshot } from '@/services/firebase';
import { cancelStoveReminders, scheduleStoveReminder } from '@/services/notifications';
import { loadSettings } from '@/services/settings';
import type { HomeSettings, StoveDeviceSnapshot } from '@/types/home-guard';

const scheduledInactivityByDevice = new Map<string, number>();

export type StoveRisk = 'none' | 'away' | 'inactivity';

export function getKitchenInactivityMinutes(stove: StoveDeviceSnapshot, now = Date.now()) {
  return Math.max(0, Math.floor((now - stove.lastMotionAt) / 60_000));
}

export function getInactivityAlertAt(stove: StoveDeviceSnapshot, settings: HomeSettings) {
  if (!stove.isHot || stove.hotSince === null) return null;
  return Math.max(
    Math.max(stove.lastMotionAt, stove.hotSince) + settings.kitchenInactivityMinutes * 60_000,
    settings.cookingTimerEndsAt ?? 0,
  );
}

export function getStoveRisk(
  stove: StoveDeviceSnapshot,
  settings: HomeSettings,
  now = Date.now(),
): StoveRisk {
  if (!stove.isHot) return 'none';
  if (settings.phoneDepartedAt !== null && now >= settings.phoneDepartedAt + settings.stoveDepartureDelayMinutes * 60_000) {
    return 'away';
  }
  const alertAt = getInactivityAlertAt(stove, settings);
  return alertAt !== null && now >= alertAt ? 'inactivity' : 'none';
}

export async function processKitchenInactivity(
  stove?: StoveDeviceSnapshot,
  settings?: HomeSettings,
): Promise<string | null> {
  const activeSettings = settings ?? (await loadSettings());
  const activeStove = stove ?? (await getStoveSnapshot(activeSettings.stoveDeviceId));
  const alertAt = getInactivityAlertAt(activeStove, activeSettings);
  const deviceId = activeStove.deviceId;

  if (!activeSettings.notificationsEnabled || alertAt === null) {
    await cancelStoveReminders(deviceId, 'inactivity');
    scheduledInactivityByDevice.delete(deviceId);
    return null;
  }

  if (scheduledInactivityByDevice.get(deviceId) === alertAt) return null;

  await cancelStoveReminders(deviceId, 'inactivity');
  const delayMinutes = Math.max(0, (alertAt - Date.now()) / 60_000);
  const notificationId = await scheduleStoveReminder({
    deviceId,
    reason: 'inactivity',
    inactiveMinutes: Math.max(activeSettings.kitchenInactivityMinutes, Math.floor((alertAt - activeStove.lastMotionAt) / 60_000)),
    delayMinutes,
  });
  scheduledInactivityByDevice.set(deviceId, alertAt);
  return notificationId;
}
