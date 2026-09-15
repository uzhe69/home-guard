import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { sendTurnOffCommand } from '@/services/firebase';
import type { DeviceType, NotificationActionResult } from '@/types/home-guard';

export const AC_REMINDER_CATEGORY = 'HOME_GUARD_AC_REMINDER';
export const STOVE_REMINDER_CATEGORY = 'HOME_GUARD_STOVE_REMINDER';
export const STOVE_ALERT_CHANNEL = 'stove-alerts';
export const TURN_OFF_ACTION = 'TURN_OFF';
export const KEEP_ON_ACTION = 'KEEP_ON';
export const ACKNOWLEDGE_ACTION = 'ACKNOWLEDGE';
export const DISMISS_ACTION = 'DISMISS';

type ScheduleAcReminderOptions = {
  temperatureCelsius: number;
  deviceId: string;
  delayMinutes?: number;
  powerConfirmed?: boolean;
};

type ScheduleStoveReminderOptions = {
  deviceId: string;
  reason: 'away' | 'inactivity';
  inactiveMinutes?: number;
  delayMinutes?: number;
};

const reminderActions: Notifications.NotificationAction[] = [
  {
    identifier: TURN_OFF_ACTION,
    buttonTitle: 'Turn It Off',
  },
  {
    identifier: KEEP_ON_ACTION,
    buttonTitle: 'Keep It On',
  },
];

function hasNotificationPermission(
  permissions: Notifications.NotificationPermissionsStatus,
) {
  return (
    permissions.granted ||
    permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function configureNotifications(): Promise<boolean> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(STOVE_ALERT_CHANNEL, {
      name: 'Stove safety alerts',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  await Promise.all([
    Notifications.setNotificationCategoryAsync(AC_REMINDER_CATEGORY, reminderActions),
    Notifications.setNotificationCategoryAsync(STOVE_REMINDER_CATEGORY, [
      { identifier: ACKNOWLEDGE_ACTION, buttonTitle: 'Acknowledge' },
      { identifier: DISMISS_ACTION, buttonTitle: 'Dismiss' },
    ]),
  ]);

  const currentPermissions = await Notifications.getPermissionsAsync();
  if (hasNotificationPermission(currentPermissions)) {
    return true;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return hasNotificationPermission(requestedPermissions);
}

export async function scheduleAcReminder({
  temperatureCelsius,
  deviceId,
  delayMinutes = 0,
  powerConfirmed = false,
}: ScheduleAcReminderOptions): Promise<string> {
  const delaySeconds = Math.max(0, Math.round(delayMinutes * 60));

  return Notifications.scheduleNotificationAsync({
    content: {
      title: powerConfirmed ? 'Your AC is still on' : 'Your AC may still be on',
      body: powerConfirmed ? 'Your AC reports that its power is on while you’re away.' : `Your room remains ${temperatureCelsius.toFixed(1)}°C and is stable or cooling while you’re away.`,
      sound: 'default',
      categoryIdentifier: AC_REMINDER_CATEGORY,
      data: { deviceId, deviceType: 'ac', temperatureCelsius },
    },
    trigger:
      delaySeconds > 0
        ? {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: delaySeconds,
          }
        : null,
  });
}

export async function cancelAcReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const presented = await Notifications.getPresentedNotificationsAsync();
  await Promise.all([
    ...scheduled.filter(({ content }) => content.data?.deviceType === 'ac').map(({ identifier }) => Notifications.cancelScheduledNotificationAsync(identifier)),
    ...presented.filter(({ request }) => request.content.data?.deviceType === 'ac').map(({ request }) => Notifications.dismissNotificationAsync(request.identifier)),
  ]);
}

export function scheduleStoveReminder({
  deviceId,
  reason,
  inactiveMinutes = 0,
  delayMinutes = 0,
}: ScheduleStoveReminderOptions): Promise<string> {
  const body =
    reason === 'away'
      ? 'The stove was hot when your phone left the home radius. Check it in person.'
      : `The stove remains hot with no kitchen motion for ${inactiveMinutes} minutes. Check it in person.`;

  return Notifications.scheduleNotificationAsync({
    identifier: `stove:${deviceId}:${reason}`,
    content: {
      title: reason === 'away' ? 'Urgent: check your stove' : 'Check your kitchen',
      body,
      sound: 'default',
      priority: reason === 'away' ? Notifications.AndroidNotificationPriority.HIGH : Notifications.AndroidNotificationPriority.DEFAULT,
      interruptionLevel: reason === 'away' ? 'timeSensitive' : 'active',
      categoryIdentifier: STOVE_REMINDER_CATEGORY,
      data: { deviceId, deviceType: 'stove', reason },
    },
    trigger: delayMinutes > 0
      ? {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(1, Math.ceil(delayMinutes * 60)),
          channelId: STOVE_ALERT_CHANNEL,
        }
      : Platform.OS === 'android' ? { channelId: STOVE_ALERT_CHANNEL } : null,
  });
}

export async function cancelStoveReminders(deviceId: string, reason?: 'away' | 'inactivity') {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled
    .filter(({ content }) => content.data?.deviceType === 'stove' && content.data.deviceId === deviceId && (!reason || content.data.reason === reason))
    .map(({ identifier }) => Notifications.cancelScheduledNotificationAsync(identifier)));
}

export async function dismissStoveAlerts(deviceId: string) {
  const presented = await Notifications.getPresentedNotificationsAsync();
  await Promise.all(presented
    .filter(({ request }) => request.content.data?.deviceType === 'stove' && request.content.data.deviceId === deviceId)
    .map(({ request }) => Notifications.dismissNotificationAsync(request.identifier)));
}

export function sendAcReminderNow(
  options: Omit<ScheduleAcReminderOptions, 'delayMinutes'>,
) {
  return scheduleAcReminder({ ...options, delayMinutes: 0 });
}

function getResponseDeviceId(response: Notifications.NotificationResponse) {
  const deviceId = response.notification.request.content.data?.deviceId;
  return typeof deviceId === 'string' ? deviceId : undefined;
}

function getResponseDeviceType(response: Notifications.NotificationResponse): DeviceType | undefined {
  const deviceType = response.notification.request.content.data?.deviceType;
  return deviceType === 'ac' || deviceType === 'stove' ? deviceType : undefined;
}

export async function processNotificationResponse(
  response: Notifications.NotificationResponse,
): Promise<NotificationActionResult> {
  const deviceId = getResponseDeviceId(response);
  const deviceType = getResponseDeviceType(response);

  if (deviceType === 'stove' || response.notification.request.content.categoryIdentifier === STOVE_REMINDER_CATEGORY) {
    if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      return { action: 'opened', deviceId, deviceType: 'stove' };
    }
    await Notifications.dismissNotificationAsync(response.notification.request.identifier);
    return {
      action: response.actionIdentifier === ACKNOWLEDGE_ACTION ? 'acknowledged' : 'dismissed',
      deviceId,
      deviceType: 'stove',
    };
  }

  if (response.actionIdentifier === TURN_OFF_ACTION && deviceId && deviceType === 'ac') {
    await sendTurnOffCommand(deviceId, 'notification', deviceType);
    return { action: 'turn_off', deviceId, deviceType };
  }

  if (response.actionIdentifier === KEEP_ON_ACTION) {
    return { action: 'keep_on', deviceId, deviceType };
  }

  if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
    return { action: 'opened', deviceId, deviceType };
  }

  return { action: 'ignored', deviceId, deviceType };
}

export async function processLastNotificationResponse(): Promise<NotificationActionResult | null> {
  const response = Notifications.getLastNotificationResponse();
  if (!response) {
    return null;
  }

  const result = await processNotificationResponse(response);
  Notifications.clearLastNotificationResponse();
  return result;
}

export function addNotificationActionListener(
  listener?: (result: NotificationActionResult) => void,
) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    void processNotificationResponse(response).then(listener);
  });
}
