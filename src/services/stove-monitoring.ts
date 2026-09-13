import { getStoveSnapshot } from '@/services/firebase';
import { scheduleStoveReminder } from '@/services/notifications';
import { loadSettings } from '@/services/settings';
import type { HomeSettings, StoveDeviceSnapshot } from '@/types/home-guard';

const alertedMotionByDevice = new Map<string, number>();

export type StoveRisk = 'none' | 'away' | 'inactivity';

export function getKitchenInactivityMinutes(
  stove: StoveDeviceSnapshot,
  now = Date.now(),
) {
  return Math.max(0, Math.floor((now - stove.lastMotionAt) / 60_000));
}

export function getStoveRisk(
  stove: StoveDeviceSnapshot,
  inactivityThresholdMinutes: number,
  isAway = false,
): StoveRisk {
  if (!stove.isActive) return 'none';
  if (isAway) return 'away';
  return getKitchenInactivityMinutes(stove) >= inactivityThresholdMinutes
    ? 'inactivity'
    : 'none';
}

export async function processKitchenInactivity(
  stove?: StoveDeviceSnapshot,
  settings?: HomeSettings,
): Promise<string | null> {
  const activeSettings = settings ?? (await loadSettings());
  if (!activeSettings.notificationsEnabled) return null;

  const activeStove =
    stove ?? (await getStoveSnapshot(activeSettings.stoveDeviceId));
  const inactiveMinutes = getKitchenInactivityMinutes(activeStove);
  const isInactive =
    getStoveRisk(
      activeStove,
      activeSettings.kitchenInactivityMinutes,
    ) === 'inactivity';

  if (!isInactive) {
    if (!activeStove.isActive) alertedMotionByDevice.delete(activeStove.deviceId);
    return null;
  }

  if (alertedMotionByDevice.get(activeStove.deviceId) === activeStove.lastMotionAt) {
    return null;
  }

  const notificationId = await scheduleStoveReminder({
    deviceId: activeStove.deviceId,
    reason: 'inactivity',
    inactiveMinutes,
  });
  alertedMotionByDevice.set(activeStove.deviceId, activeStove.lastMotionAt);
  return notificationId;
}
