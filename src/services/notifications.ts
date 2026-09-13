import * as Notifications from 'expo-notifications';

import { sendTurnOffCommand } from '@/services/firebase';
import type { NotificationActionResult } from '@/types/ac-guard';

export const AC_REMINDER_CATEGORY = 'AC_GUARD_REMINDER';
export const TURN_OFF_ACTION = 'TURN_OFF';
export const KEEP_ON_ACTION = 'KEEP_ON';

type ScheduleAcReminderOptions = {
  temperatureCelsius: number;
  deviceId: string;
  delayMinutes?: number;
};

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

  await Notifications.setNotificationCategoryAsync(AC_REMINDER_CATEGORY, [
    {
      identifier: TURN_OFF_ACTION,
      buttonTitle: 'Turn It Off',
    },
    {
      identifier: KEEP_ON_ACTION,
      buttonTitle: 'Keep It On',
    },
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
}: ScheduleAcReminderOptions): Promise<string> {
  const delaySeconds = Math.max(0, Math.round(delayMinutes * 60));

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your AC may still be on',
      body: `Your room is ${temperatureCelsius.toFixed(1)}°C and no one is home.`,
      sound: 'default',
      categoryIdentifier: AC_REMINDER_CATEGORY,
      data: { deviceId, temperatureCelsius },
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

export function sendAcReminderNow(
  options: Omit<ScheduleAcReminderOptions, 'delayMinutes'>,
) {
  return scheduleAcReminder({ ...options, delayMinutes: 0 });
}

function getResponseDeviceId(response: Notifications.NotificationResponse) {
  const deviceId = response.notification.request.content.data?.deviceId;
  return typeof deviceId === 'string' ? deviceId : undefined;
}

export async function processNotificationResponse(
  response: Notifications.NotificationResponse,
): Promise<NotificationActionResult> {
  const deviceId = getResponseDeviceId(response);

  if (response.actionIdentifier === TURN_OFF_ACTION && deviceId) {
    await sendTurnOffCommand(deviceId, 'notification');
    return { action: 'turn_off', deviceId };
  }

  if (response.actionIdentifier === KEEP_ON_ACTION) {
    return { action: 'keep_on', deviceId };
  }

  if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
    return { action: 'opened', deviceId };
  }

  return { action: 'ignored', deviceId };
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
