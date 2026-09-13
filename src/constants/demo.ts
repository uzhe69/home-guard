import type { DeviceSnapshot, HomeSettings } from '@/types/home-guard';

export const DEFAULT_SETTINGS: HomeSettings = {
  homeLocation: {
    latitude: 1.3521,
    longitude: 103.8198,
  },
  homeAddress: '18 Tampines Avenue 1',
  radiusMeters: 200,
  reminderDelayMinutes: 5,
  temperatureThresholdCelsius: 26,
  notificationsEnabled: true,
  deviceId: 'bedroom-ac',
  setupComplete: false,
};

export const DEMO_DEVICE_SNAPSHOT: DeviceSnapshot = {
  deviceId: DEFAULT_SETTINGS.deviceId,
  roomTemperatureCelsius: 22.4,
  connectionStatus: 'online',
  lastSeenAt: Date.now() - 60_000,
  lastCommand: {
    value: 'ON',
    requestedAt: Date.now() - 45 * 60_000,
    source: 'demo',
  },
};

export const DEMO_TEMPERATURE_HISTORY = [
  23.7, 23.4, 24.1, 24.5, 23.8, 22.9, 23.6, 24.9, 25.2, 24.6, 24.2, 24.8,
] as const;

export const DEMO_WEEKLY_SAVINGS = [0.3, 0.5, 1, 0.7, 0.8, 1.6, 2] as const;
