import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';
import {
  get,
  getDatabase,
  onValue,
  ref,
  serverTimestamp,
  set,
  type Database,
} from 'firebase/database';

import { DEMO_AC_SNAPSHOT, DEMO_STOVE_SNAPSHOT } from '@/constants/demo';
import type {
  AcDeviceSnapshot,
  DeviceCommand,
  DeviceCommandSource,
  DeviceCommandValue,
  StoveDeviceSnapshot,
} from '@/types/home-guard';

type FirebaseSession = {
  app: FirebaseApp;
  auth: Auth;
  database: Database;
};

type FirebaseDeviceValue = {
  connected?: boolean;
  connectionStatus?: string;
  lastSeenAt?: number;
  temperature?: number;
  temperatureCelsius?: number;
  stoveActive?: boolean;
  activeBurners?: number;
  gasFlowLitersPerMinute?: number;
  activeSince?: number;
  lastMotionAt?: number;
  telemetry?: {
    temperatureCelsius?: number;
    lastSeenAt?: number;
    stoveActive?: boolean;
    activeBurners?: number;
    gasFlowLitersPerMinute?: number;
    activeSince?: number;
    lastMotionAt?: number;
  };
  commands?: {
    latest?: Partial<DeviceCommand>;
  };
  lastCommand?: Partial<DeviceCommand>;
};

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const mockAcListeners = new Set<(snapshot: AcDeviceSnapshot) => void>();
const mockStoveListeners = new Set<(snapshot: StoveDeviceSnapshot) => void>();
let mockAcSnapshot: AcDeviceSnapshot = { ...DEMO_AC_SNAPSHOT };
let mockStoveSnapshot: StoveDeviceSnapshot = { ...DEMO_STOVE_SNAPSHOT };
let sessionPromise: Promise<FirebaseSession> | null = null;

export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.databaseURL &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  );
}

export function getFirebaseMode(): 'live' | 'mock' {
  return isFirebaseConfigured() ? 'live' : 'mock';
}

async function getFirebaseSession(): Promise<FirebaseSession | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  sessionPromise ??= (async () => {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const auth = getAuth(app);

    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    return { app, auth, database: getDatabase(app) };
  })();

  return sessionPromise;
}

export async function ensureAnonymousSession(): Promise<{
  uid: string;
  isMock: boolean;
}> {
  const session = await getFirebaseSession();

  if (!session) {
    return { uid: 'demo-user', isMock: true };
  }

  return { uid: session.auth.currentUser!.uid, isMock: false };
}

function parseTimestamp(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function parseCommand(value: unknown): DeviceCommand | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const command = value as Partial<DeviceCommand>;
  if (command.value !== 'ON' && command.value !== 'OFF') {
    return null;
  }

  return {
    value: command.value,
    requestedAt: parseTimestamp(command.requestedAt, Date.now()),
    source:
      command.source === 'notification' ||
      command.source === 'demo' ||
      command.source === 'app'
        ? command.source
        : 'app',
  };
}

function parseAcSnapshot(
  deviceId: string,
  value: FirebaseDeviceValue | null,
): AcDeviceSnapshot {
  const temperature =
    value?.telemetry?.temperatureCelsius ??
    value?.temperatureCelsius ??
    value?.temperature;
  const lastSeenAt = value?.telemetry?.lastSeenAt ?? value?.lastSeenAt;

  return {
    deviceId,
    deviceType: 'ac',
    roomTemperatureCelsius:
      typeof temperature === 'number' && Number.isFinite(temperature)
        ? temperature
        : DEMO_AC_SNAPSHOT.roomTemperatureCelsius,
    connectionStatus:
      value?.connectionStatus === 'offline' || value?.connected === false
        ? 'offline'
        : 'online',
    lastSeenAt: parseTimestamp(lastSeenAt, Date.now()),
    lastCommand: parseCommand(
      value?.commands?.latest ?? value?.lastCommand ?? null,
    ),
  };
}

function parseNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function parseStoveSnapshot(
  deviceId: string,
  value: FirebaseDeviceValue | null,
): StoveDeviceSnapshot {
  const telemetry = value?.telemetry;
  const stoveActive = telemetry?.stoveActive ?? value?.stoveActive;
  const activeSince = telemetry?.activeSince ?? value?.activeSince;

  return {
    deviceId,
    deviceType: 'stove',
    isActive: typeof stoveActive === 'boolean' ? stoveActive : DEMO_STOVE_SNAPSHOT.isActive,
    activeBurners: parseNumber(telemetry?.activeBurners ?? value?.activeBurners, 0),
    gasFlowLitersPerMinute: parseNumber(
      telemetry?.gasFlowLitersPerMinute ?? value?.gasFlowLitersPerMinute,
      0,
    ),
    activeSince:
      typeof activeSince === 'number' && Number.isFinite(activeSince) ? activeSince : null,
    lastMotionAt: parseTimestamp(
      telemetry?.lastMotionAt ?? value?.lastMotionAt,
      Date.now(),
    ),
    connectionStatus:
      value?.connectionStatus === 'offline' || value?.connected === false
        ? 'offline'
        : 'online',
    lastSeenAt: parseTimestamp(telemetry?.lastSeenAt ?? value?.lastSeenAt, Date.now()),
    lastCommand: parseCommand(value?.commands?.latest ?? value?.lastCommand ?? null),
  };
}

export async function getDeviceSnapshot(
  deviceId: string,
): Promise<AcDeviceSnapshot> {
  const session = await getFirebaseSession();

  if (!session) {
    return { ...mockAcSnapshot, deviceId };
  }

  const snapshot = await get(ref(session.database, `devices/${deviceId}`));
  return parseAcSnapshot(deviceId, snapshot.val() as FirebaseDeviceValue | null);
}

export async function getStoveSnapshot(deviceId: string): Promise<StoveDeviceSnapshot> {
  const session = await getFirebaseSession();

  if (!session) {
    return { ...mockStoveSnapshot, deviceId };
  }

  const snapshot = await get(ref(session.database, `devices/${deviceId}`));
  return parseStoveSnapshot(deviceId, snapshot.val() as FirebaseDeviceValue | null);
}

export async function getRoomTemperature(deviceId: string): Promise<number> {
  const snapshot = await getDeviceSnapshot(deviceId);
  return snapshot.roomTemperatureCelsius;
}

export function subscribeToDevice(
  deviceId: string,
  listener: (snapshot: AcDeviceSnapshot) => void,
): () => void {
  if (!isFirebaseConfigured()) {
    mockAcListeners.add(listener);
    listener({ ...mockAcSnapshot, deviceId });
    return () => mockAcListeners.delete(listener);
  }

  let unsubscribe = () => {};
  let cancelled = false;

  void getFirebaseSession().then((session) => {
    if (!session || cancelled) {
      return;
    }

    unsubscribe = onValue(ref(session.database, `devices/${deviceId}`), (value) => {
      listener(
        parseAcSnapshot(deviceId, value.val() as FirebaseDeviceValue | null),
      );
    });
  });

  return () => {
    cancelled = true;
    unsubscribe();
  };
}

export function subscribeToStoveDevice(
  deviceId: string,
  listener: (snapshot: StoveDeviceSnapshot) => void,
): () => void {
  if (!isFirebaseConfigured()) {
    mockStoveListeners.add(listener);
    listener({ ...mockStoveSnapshot, deviceId });
    return () => mockStoveListeners.delete(listener);
  }

  let unsubscribe = () => {};
  let cancelled = false;

  void getFirebaseSession().then((session) => {
    if (!session || cancelled) return;

    unsubscribe = onValue(ref(session.database, `devices/${deviceId}`), (value) => {
      listener(parseStoveSnapshot(deviceId, value.val() as FirebaseDeviceValue | null));
    });
  });

  return () => {
    cancelled = true;
    unsubscribe();
  };
}

export async function sendDeviceCommand(
  deviceId: string,
  value: DeviceCommandValue,
  source: DeviceCommandSource = 'app',
  deviceType: 'ac' = 'ac',
): Promise<DeviceCommand> {
  if (deviceType !== 'ac') throw new Error('Only the AC supports remote commands.');
  const session = await getFirebaseSession();
  const command: DeviceCommand = {
    value,
    requestedAt: Date.now(),
    source,
  };

  if (!session) {
    mockAcSnapshot = {
      ...mockAcSnapshot,
      deviceId,
      lastCommand: command,
      lastSeenAt: Date.now(),
    };
    mockAcListeners.forEach((listener) => listener({ ...mockAcSnapshot }));
    return command;
  }

  await set(ref(session.database, `devices/${deviceId}/commands/latest`), {
    value,
    requestedAt: serverTimestamp(),
    requestedBy: session.auth.currentUser!.uid,
    source,
  });

  return command;
}

export function sendTurnOffCommand(
  deviceId: string,
  source: DeviceCommandSource = 'app',
  deviceType: 'ac' = 'ac',
) {
  return sendDeviceCommand(deviceId, 'OFF', source, deviceType);
}

export async function setMockTemperature(
  temperatureCelsius: number,
): Promise<AcDeviceSnapshot> {
  if (!Number.isFinite(temperatureCelsius)) {
    throw new Error('Temperature must be a finite number.');
  }

  mockAcSnapshot = {
    ...mockAcSnapshot,
    roomTemperatureCelsius: temperatureCelsius,
    connectionStatus: 'online',
    lastSeenAt: Date.now(),
  };
  mockAcListeners.forEach((listener) => listener({ ...mockAcSnapshot }));
  return { ...mockAcSnapshot };
}

export async function setMockStoveState(
  deviceId: string,
  isActive: boolean,
  lastMotionAt = Date.now(),
): Promise<StoveDeviceSnapshot> {
  mockStoveSnapshot = {
    ...mockStoveSnapshot,
    deviceId,
    isActive,
    activeBurners: isActive ? 1 : 0,
    gasFlowLitersPerMinute: isActive ? 1.4 : 0,
    activeSince: isActive ? (mockStoveSnapshot.activeSince ?? Date.now()) : null,
    lastMotionAt,
    lastSeenAt: Date.now(),
    lastCommand: {
      value: isActive ? 'ON' : 'OFF',
      requestedAt: Date.now(),
      source: 'demo',
    },
  };
  mockStoveListeners.forEach((listener) => listener({ ...mockStoveSnapshot }));
  return { ...mockStoveSnapshot };
}
