export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type HomeSettings = {
  homeLocation: GeoPoint | null;
  homeAddress: string;
  radiusMeters: number;
  reminderDelayMinutes: number;
  acDelayMode: 'smart' | 'fixed';
  temperatureThresholdCelsius: number;
  notificationsEnabled: boolean;
  acDeviceId: string;
  stoveDeviceId: string;
  kitchenInactivityMinutes: number;
  cookingTimerEndsAt: number | null;
  stoveDepartureDelayMinutes: 2 | 3 | 5;
  phoneDepartedAt: number | null;
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
  powerState: 'ON' | 'OFF' | null;
  powerStateUpdatedAt: number | null;
};

export type RoomTemperatureReading = {
  timestamp: number;
  temperatureCelsius: number;
};

export type OutdoorTemperature = {
  temperatureCelsius: number;
  timestamp: number;
  stationName: string;
};

export type AcStatus = 'home' | 'waiting' | 'warming' | 'likely-on' | 'off' | 'unable-to-verify';

export type AcDeparture = {
  deviceId: string;
  departedAt: number;
  temperatureAtDeparture: number | null;
  thresholdCelsius: number;
  lastEvaluatedThresholdCelsius: number;
  outdoorAtDeparture: OutdoorTemperature | null;
  recentReadings: RoomTemperatureReading[];
  consecutiveOnReadings: number;
  lastEvaluatedReadingAt: number | null;
  alertSent: boolean;
};

export type AcCalibration = {
  deviceId: string;
  startedAt: number;
  temperatureAtStart: number;
  outdoorAtStart: OutdoorTemperature;
};

export type AcMonitoringState = {
  departure: AcDeparture | null;
  readings: RoomTemperatureReading[];
  outdoor: OutdoorTemperature | null;
  status: AcStatus;
  explanation: string;
  estimatedCrossingMinutes: number | null;
  thermalDeviceId: string | null;
  thermalTimeConstantsMinutes: number[];
  calibration: AcCalibration | null;
  calibrationMessage: string;
};

export type StoveDeviceSnapshot = BaseDeviceSnapshot & {
  deviceType: 'stove';
  isHot: boolean;
  temperatureCelsius: number | null;
  hotSince: number | null;
  isActive: boolean;
  activeBurners: number;
  gasFlowLitersPerMinute: number;
  activeSince: number | null;
  lastMotionAt: number;
};

export type NotificationActionResult = {
  action: 'turn_off' | 'keep_on' | 'opened' | 'ignored' | 'acknowledged' | 'dismissed';
  deviceId?: string;
  deviceType?: DeviceType;
};
