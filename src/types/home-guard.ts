export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type HomeSettings = {
  homeLocation: GeoPoint | null;
  homeAddress: string;
  radiusMeters: number;
  reminderDelayMinutes: number;
  temperatureThresholdCelsius: number;
  notificationsEnabled: boolean;
  acDeviceId: string;
  stoveDeviceId: string;
  kitchenInactivityMinutes: number;
  setupComplete: boolean;
};

export type ConnectionStatus = 'online' | 'offline';
export type DeviceType = 'ac' | 'stove';
export type DeviceCommandValue = 'ON' | 'OFF';
export type DeviceCommandSource = 'app' | 'notification' | 'demo';

export type DeviceCommand = {
  value: DeviceCommandValue;
  requestedAt: number;
  source: DeviceCommandSource;
};

export type BaseDeviceSnapshot = {
  deviceId: string;
  connectionStatus: ConnectionStatus;
  lastSeenAt: number;
  lastCommand: DeviceCommand | null;
};

export type AcDeviceSnapshot = BaseDeviceSnapshot & {
  deviceType: 'ac';
  roomTemperatureCelsius: number;
};

export type StoveDeviceSnapshot = BaseDeviceSnapshot & {
  deviceType: 'stove';
  isActive: boolean;
  activeBurners: number;
  gasFlowLitersPerMinute: number;
  activeSince: number | null;
  lastMotionAt: number;
};

export type NotificationActionResult = {
  action: 'turn_off' | 'keep_on' | 'opened' | 'ignored';
  deviceId?: string;
  deviceType?: DeviceType;
};
