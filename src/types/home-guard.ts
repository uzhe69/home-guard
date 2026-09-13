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
  deviceId: string;
  setupComplete: boolean;
};

export type ConnectionStatus = 'online' | 'offline';
export type DeviceCommandValue = 'ON' | 'OFF';
export type DeviceCommandSource = 'app' | 'notification' | 'demo';

export type DeviceCommand = {
  value: DeviceCommandValue;
  requestedAt: number;
  source: DeviceCommandSource;
};

export type DeviceSnapshot = {
  deviceId: string;
  roomTemperatureCelsius: number;
  connectionStatus: ConnectionStatus;
  lastSeenAt: number;
  lastCommand: DeviceCommand | null;
};

export type NotificationActionResult = {
  action: 'turn_off' | 'keep_on' | 'opened' | 'ignored';
  deviceId?: string;
};
