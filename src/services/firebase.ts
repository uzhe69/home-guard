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

import { DEMO_DEVICE_SNAPSHOT } from '@/constants/demo';
import type {
  DeviceCommand,
  DeviceCommandSource,
  DeviceCommandValue,
  DeviceSnapshot,
} from '@/types/ac-guard';

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
  telemetry?: {
    temperatureCelsius?: number;
    lastSeenAt?: number;
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

const mockListeners = new Set<(snapshot: DeviceSnapshot) => void>();
let mockSnapshot: DeviceSnapshot = { ...DEMO_DEVICE_SNAPSHOT };
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

function parseDeviceSnapshot(
  deviceId: string,
  value: FirebaseDeviceValue | null,
): DeviceSnapshot {
  const temperature =
    value?.telemetry?.temperatureCelsius ??
    value?.temperatureCelsius ??
    value?.temperature;
  const lastSeenAt = value?.telemetry?.lastSeenAt ?? value?.lastSeenAt;

  return {
    deviceId,
    roomTemperatureCelsius:
      typeof temperature === 'number' && Number.isFinite(temperature)
        ? temperature
        : DEMO_DEVICE_SNAPSHOT.roomTemperatureCelsius,
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

export async function getDeviceSnapshot(
  deviceId: string,
): Promise<DeviceSnapshot> {
  const session = await getFirebaseSession();

  if (!session) {
    return { ...mockSnapshot, deviceId };
  }

  const snapshot = await get(ref(session.database, `devices/${deviceId}`));
  return parseDeviceSnapshot(deviceId, snapshot.val() as FirebaseDeviceValue | null);
}

export async function getRoomTemperature(deviceId: string): Promise<number> {
  const snapshot = await getDeviceSnapshot(deviceId);
  return snapshot.roomTemperatureCelsius;
}

export function subscribeToDevice(
  deviceId: string,
  listener: (snapshot: DeviceSnapshot) => void,
): () => void {
  if (!isFirebaseConfigured()) {
    mockListeners.add(listener);
    listener({ ...mockSnapshot, deviceId });
    return () => mockListeners.delete(listener);
  }

  let unsubscribe = () => {};
  let cancelled = false;

  void getFirebaseSession().then((session) => {
    if (!session || cancelled) {
      return;
    }

    unsubscribe = onValue(ref(session.database, `devices/${deviceId}`), (value) => {
      listener(
        parseDeviceSnapshot(deviceId, value.val() as FirebaseDeviceValue | null),
      );
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
): Promise<DeviceCommand> {
  const session = await getFirebaseSession();
  const command: DeviceCommand = {
    value,
    requestedAt: Date.now(),
    source,
  };

  if (!session) {
    mockSnapshot = {
      ...mockSnapshot,
      deviceId,
      lastCommand: command,
      lastSeenAt: Date.now(),
    };
    mockListeners.forEach((listener) => listener({ ...mockSnapshot }));
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
) {
  return sendDeviceCommand(deviceId, 'OFF', source);
}

export async function setMockTemperature(
  temperatureCelsius: number,
): Promise<DeviceSnapshot> {
  if (!Number.isFinite(temperatureCelsius)) {
    throw new Error('Temperature must be a finite number.');
  }

  mockSnapshot = {
    ...mockSnapshot,
    roomTemperatureCelsius: temperatureCelsius,
    connectionStatus: 'online',
    lastSeenAt: Date.now(),
  };
  mockListeners.forEach((listener) => listener({ ...mockSnapshot }));
  return { ...mockSnapshot };
}
