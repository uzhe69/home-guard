import type { AcDeviceSnapshot, HomeSettings, StoveDeviceSnapshot } from '@/types/home-guard';

export const DEFAULT_SETTINGS: HomeSettings = {
  homeLocation: {
    latitude: 1.3521,
    longitude: 103.8198,
  },
  homeAddress: '18 Tampines Avenue 1',
  radiusMeters: 100,
  reminderDelayMinutes: 30,
  acDelayMode: 'smart',
  temperatureThresholdCelsius: 26,
  notificationsEnabled: true,
  acDeviceId: 'bedroom-ac',
  stoveDeviceId: 'kitchen-stove',
  kitchenInactivityMinutes: 60,
  cookingTimerEndsAt: null,
  stoveDepartureDelayMinutes: 3,
  phoneDepartedAt: null,
  setupComplete: false,
};

export const DEMO_AC_SNAPSHOT: AcDeviceSnapshot = {
  deviceId: DEFAULT_SETTINGS.acDeviceId,
  deviceType: 'ac',
  roomTemperatureCelsius: 22.4,
  powerState: null,
  powerStateUpdatedAt: null,
  connectionStatus: 'online',
  lastSeenAt: Date.now() - 60_000,
  lastCommand: {
    value: 'ON',
    requestedAt: Date.now() - 45 * 60_000,
    source: 'demo',
  },
};

export const DEMO_STOVE_SNAPSHOT: StoveDeviceSnapshot = {
  deviceId: DEFAULT_SETTINGS.stoveDeviceId,
  deviceType: 'stove',
  isHot: true,
  temperatureCelsius: 180,
  hotSince: Date.now() - 38 * 60_000,
  isActive: true,
  activeBurners: 1,
  gasFlowLitersPerMinute: 1.4,
  activeSince: Date.now() - 38 * 60_000,
  lastMotionAt: Date.now() - 12 * 60_000,
  connectionStatus: 'online',
  lastSeenAt: Date.now() - 30_000,
  lastCommand: {
    value: 'ON',
    requestedAt: Date.now() - 38 * 60_000,
    source: 'demo',
  },
};

export const DEMO_TEMPERATURE_HISTORY = [
  23.7, 23.4, 24.1, 24.5, 23.8, 22.9, 23.6, 24.9, 25.2, 24.6, 24.2, 24.8,
] as const;

export const DEMO_WEEKLY_SAVINGS = [0.3, 0.5, 1, 0.7, 0.8, 1.6, 2] as const;

export const DEMO_GAS_FLOW_HISTORY = [0, 0, 0.8, 1.2, 1.4, 1.4, 1.1, 0.4, 0] as const;
