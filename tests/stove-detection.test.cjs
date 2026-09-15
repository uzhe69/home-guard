const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const NOW = 1_800_000_000_000;
const MINUTE = 60_000;
class FixedDate extends Date { static now() { return NOW; } }

function load(file, dependencies = {}, env = {}) {
  const source = ts.transpileModule(readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'Date', 'process', source)(
    (name) => {
      assert.ok(name in dependencies, `Missing test dependency: ${name}`);
      return dependencies[name];
    }, module, module.exports, FixedDate, { env },
  );
  return module.exports;
}

const { DEFAULT_SETTINGS, DEMO_STOVE_SNAPSHOT } = load('src/constants/demo.ts');
const settings = { ...DEFAULT_SETTINGS, setupComplete: true };
const stove = { ...DEMO_STOVE_SNAPSHOT, isHot: true, hotSince: NOW - 120 * MINUTE, lastMotionAt: NOW - 60 * MINUTE };

function monitoring() {
  const scheduled = [];
  const cancelled = [];
  const service = load('src/services/stove-monitoring.ts', {
    '@/services/firebase': { getStoveSnapshot: async () => stove },
    '@/services/settings': { loadSettings: async () => settings },
    '@/services/notifications': {
      scheduleStoveReminder: async (options) => { scheduled.push(options); return 'notification-id'; },
      cancelStoveReminders: async (...args) => cancelled.push(args),
    },
  });
  return { ...service, scheduled, cancelled };
}

for (const duration of [30, 60, 90, 137]) {
  test(`inactivity alerts at exactly ${duration} minutes of continuous heat without motion`, () => {
    const { getStoveRisk } = monitoring();
    const config = { ...settings, kitchenInactivityMinutes: duration };
    const snapshot = { ...stove, hotSince: NOW - (duration + 10) * MINUTE, lastMotionAt: NOW - duration * MINUTE };
    assert.equal(getStoveRisk(snapshot, config, NOW - 1), 'none');
    assert.equal(getStoveRisk(snapshot, config, NOW), 'inactivity');
    assert.equal(getStoveRisk({ ...snapshot, isHot: false, isActive: true }, config, NOW), 'none');
    assert.equal(getStoveRisk({ ...snapshot, lastMotionAt: NOW }, config, NOW), 'none');
  });
}

test('old motion cannot alert before the stove has remained hot for the threshold', () => {
  const { getStoveRisk } = monitoring();
  assert.equal(getStoveRisk({ ...stove, hotSince: NOW - 10 * MINUTE }, settings, NOW), 'none');
  assert.equal(getStoveRisk({ ...stove, hotSince: null }, settings, NOW), 'none');
  assert.equal(getStoveRisk({ ...stove, isActive: false }, settings, NOW), 'inactivity');
});

test('one-time timer suppresses inactivity until expiry and then restores normal checks', () => {
  const { getStoveRisk } = monitoring();
  const config = { ...settings, cookingTimerEndsAt: NOW + 120 * MINUTE };
  assert.equal(getStoveRisk(stove, config, NOW), 'none');
  assert.equal(getStoveRisk(stove, config, config.cookingTimerEndsAt - 1), 'none');
  assert.equal(getStoveRisk(stove, config, config.cookingTimerEndsAt), 'inactivity');
  assert.equal(getStoveRisk({ ...stove, lastMotionAt: config.cookingTimerEndsAt - 5 * MINUTE }, config, config.cookingTimerEndsAt), 'none');
  assert.equal(getStoveRisk(stove, { ...settings, cookingTimerEndsAt: NOW - 1 }, NOW), 'inactivity');
});

for (const delay of [2, 3, 5]) {
  test(`departure alerts after ${delay} minutes independently of motion and cooking timer`, () => {
    const { getStoveRisk } = monitoring();
    const config = { ...settings, stoveDepartureDelayMinutes: delay, phoneDepartedAt: NOW, cookingTimerEndsAt: NOW + 240 * MINUTE };
    const snapshot = { ...stove, lastMotionAt: NOW };
    assert.equal(getStoveRisk(snapshot, config, NOW + delay * MINUTE - 1), 'none');
    assert.equal(getStoveRisk(snapshot, config, NOW + delay * MINUTE), 'away');
    assert.equal(getStoveRisk({ ...snapshot, isHot: false }, config, NOW + delay * MINUTE), 'none');
  });
}

test('inactivity scheduling is deduplicated and rescheduled on motion and timer changes', async () => {
  const service = monitoring();
  const snapshot = { ...stove, lastMotionAt: NOW - 10 * MINUTE };
  assert.equal(await service.processKitchenInactivity(snapshot, settings), 'notification-id');
  assert.equal(service.scheduled[0].delayMinutes, 50);
  assert.equal(await service.processKitchenInactivity(snapshot, settings), null);
  await service.processKitchenInactivity({ ...snapshot, lastMotionAt: NOW }, settings);
  assert.equal(service.scheduled[1].delayMinutes, 60);
  await service.processKitchenInactivity(snapshot, { ...settings, cookingTimerEndsAt: NOW + 120 * MINUTE });
  assert.equal(service.scheduled[2].delayMinutes, 120);
  await service.processKitchenInactivity(snapshot, settings);
  assert.equal(service.scheduled[3].delayMinutes, 50);
});

test('switching from a scheduled threshold to an immediate alert and back restores scheduling', async () => {
  const service = monitoring();
  await service.processKitchenInactivity(stove, { ...settings, kitchenInactivityMinutes: 90 });
  assert.equal(service.scheduled[0].delayMinutes, 30);
  await service.processKitchenInactivity(stove, { ...settings, kitchenInactivityMinutes: 30 });
  assert.equal(service.scheduled[1].delayMinutes, 0);
  await service.processKitchenInactivity(stove, { ...settings, kitchenInactivityMinutes: 90 });
  assert.equal(service.scheduled[2].delayMinutes, 30);
});

test('cooling or disabling notifications cancels alerts and permits a new hot session', async () => {
  const service = monitoring();
  await service.processKitchenInactivity(stove, settings);
  assert.equal(service.scheduled[0].delayMinutes, 0);
  assert.equal(await service.processKitchenInactivity(stove, settings), null);
  await service.processKitchenInactivity({ ...stove, isHot: false }, settings);
  await service.processKitchenInactivity(stove, settings);
  assert.equal(service.scheduled.length, 2);
  await service.processKitchenInactivity(stove, { ...settings, notificationsEnabled: false });
  assert.equal(service.cancelled.at(-1)[1], 'inactivity');
  assert.equal(service.scheduled.length, 2);
});

function geofencing() {
  let stored = { ...settings };
  const scheduled = [];
  const cancelled = [];
  let task;
  let regions;
  const service = load('src/services/geofencing.ts', {
    'expo-location': {
      GeofencingEventType: { Enter: 1, Exit: 2 },
      requestForegroundPermissionsAsync: async () => ({ granted: true }),
      requestBackgroundPermissionsAsync: async () => ({ granted: true }),
      startGeofencingAsync: async (_, value) => { regions = value; },
    },
    'expo-task-manager': { isTaskDefined: () => false, defineTask: (_, handler) => { task = handler; } },
    '@/services/firebase': { getStoveSnapshot: async () => stove, getRoomTemperature: async () => 22 },
    '@/services/settings': {
      loadSettings: async () => stored,
      updateSettings: async (patch) => { stored = { ...stored, ...patch }; return stored; },
    },
    '@/services/notifications': {
      cancelStoveReminders: async (...args) => cancelled.push(args),
      scheduleStoveReminder: async (options) => { scheduled.push(options); return 'stove-id'; },
      scheduleAcReminder: async () => 'ac-id',
    },
  });
  return { ...service, scheduled, cancelled, task: () => task, regions: () => regions, stored: () => stored };
}

test('geofence exit uses the short stove delay and entry cancels it', async () => {
  const service = geofencing();
  await service.task()({ data: { eventType: 2 } });
  assert.equal(service.stored().phoneDepartedAt, NOW);
  assert.equal(service.scheduled[0].delayMinutes, 3);
  assert.equal(service.scheduled[0].reason, 'away');
  await service.task()({ data: { eventType: 1 } });
  assert.equal(service.stored().phoneDepartedAt, null);
  assert.equal(service.cancelled.at(-1)[1], 'away');
  await service.startHomeGeofence();
  assert.equal(service.regions()[0].notifyOnEnter, true);
});

test('departure scheduling respects delay changes, cooling, and notification preference', async () => {
  const service = geofencing();
  const config = { ...settings, phoneDepartedAt: NOW - MINUTE, stoveDepartureDelayMinutes: 2 };
  await service.reconcileStoveDeparture(stove, config);
  assert.equal(service.scheduled[0].delayMinutes, 1);
  assert.equal(await service.reconcileStoveDeparture(stove, config), null);
  await service.reconcileStoveDeparture(stove, { ...config, stoveDepartureDelayMinutes: 5 });
  assert.equal(service.scheduled[1].delayMinutes, 4);
  await service.reconcileStoveDeparture({ ...stove, isHot: false }, config);
  await service.reconcileStoveDeparture(stove, { ...config, notificationsEnabled: false });
  assert.equal(service.scheduled.length, 2);
  assert.equal(service.cancelled.at(-1)[1], 'away');
});

function notifications() {
  const scheduled = [];
  const commands = [];
  const categories = [];
  const dismissed = [];
  const native = {
    AndroidImportance: { HIGH: 4 },
    AndroidNotificationPriority: { HIGH: 'high', DEFAULT: 'default' },
    SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
    DEFAULT_ACTION_IDENTIFIER: 'DEFAULT',
    IosAuthorizationStatus: { PROVISIONAL: 3 },
    setNotificationHandler: () => {},
    setNotificationChannelAsync: async () => {},
    setNotificationCategoryAsync: async (...args) => categories.push(args),
    getPermissionsAsync: async () => ({ granted: true }),
    scheduleNotificationAsync: async (request) => { scheduled.push(request); return request.identifier; },
    dismissNotificationAsync: async (id) => dismissed.push(id),
  };
  const service = load('src/services/notifications.ts', {
    'expo-notifications': native,
    'react-native': { Platform: { OS: 'android' } },
    '@/services/firebase': { sendTurnOffCommand: async (...args) => commands.push(args) },
  });
  return { ...service, scheduled, commands, categories, dismissed };
}

test('stove categories only acknowledge or dismiss and departure alerts have high priority', async () => {
  const service = notifications();
  await service.configureNotifications();
  assert.deepEqual(service.categories.find(([id]) => id === service.STOVE_REMINDER_CATEGORY)[1].map(({ identifier }) => identifier), ['ACKNOWLEDGE', 'DISMISS']);
  await service.scheduleStoveReminder({ deviceId: stove.deviceId, reason: 'away', delayMinutes: 2 });
  assert.equal(service.scheduled[0].trigger.seconds, 120);
  assert.equal(service.scheduled[0].trigger.channelId, service.STOVE_ALERT_CHANNEL);
  assert.equal(service.scheduled[0].content.priority, 'high');
  assert.equal(service.scheduled[0].content.interruptionLevel, 'timeSensitive');
});

test('current and legacy stove notification actions never send remote commands', async () => {
  const service = notifications();
  const response = (action, deviceType = 'stove') => ({ actionIdentifier: action, notification: { request: { identifier: 'notice', content: { categoryIdentifier: deviceType === 'stove' ? service.STOVE_REMINDER_CATEGORY : service.AC_REMINDER_CATEGORY, data: { deviceId: stove.deviceId, deviceType } } } } });
  assert.equal((await service.processNotificationResponse(response('ACKNOWLEDGE'))).action, 'acknowledged');
  assert.equal((await service.processNotificationResponse(response('DISMISS'))).action, 'dismissed');
  await service.processNotificationResponse(response('TURN_OFF'));
  await service.processNotificationResponse(response('KEEP_ON'));
  const legacy = response('TURN_OFF');
  delete legacy.notification.request.content.data.deviceType;
  await service.processNotificationResponse(legacy);
  assert.equal(service.commands.length, 0);
  await service.processNotificationResponse(response('TURN_OFF', 'ac'));
  assert.equal(service.commands.length, 1);
});

test('stored settings migrate to defaults and reject invalid durations', async () => {
  const service = load('src/services/settings.ts', {
    'expo-secure-store': { AFTER_FIRST_UNLOCK: 1, isAvailableAsync: async () => false },
    '@/constants/demo': { DEFAULT_SETTINGS },
  });
  const restored = await service.saveSettings({ kitchenInactivityMinutes: -1, stoveDepartureDelayMinutes: 60, cookingTimerEndsAt: NaN });
  assert.equal(restored.kitchenInactivityMinutes, 60);
  assert.equal(restored.stoveDepartureDelayMinutes, 3);
  assert.equal(restored.cookingTimerEndsAt, null);
  assert.equal(restored.phoneDepartedAt, null);
  const custom = await service.updateSettings({ kitchenInactivityMinutes: 137 });
  assert.equal(custom.kitchenInactivityMinutes, 137);
});

test('live stove telemetry uses infrared heat rather than active-state fallback', async () => {
  let value = { telemetry: { isHot: true, temperatureCelsius: 180, hotSince: NOW - 90 * MINUTE, lastMotionAt: NOW - 60 * MINUTE } };
  const service = load('src/services/firebase.ts', {
    'firebase/app': { getApps: () => [], initializeApp: () => ({}) },
    'firebase/auth': { getAuth: () => ({ currentUser: { uid: 'user' } }) },
    'firebase/database': { getDatabase: () => ({}), ref: () => ({}), get: async () => ({ val: () => value }) },
    '@/constants/demo': load('src/constants/demo.ts'),
  }, { EXPO_PUBLIC_FIREBASE_API_KEY: 'test', EXPO_PUBLIC_FIREBASE_DATABASE_URL: 'test', EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'test', EXPO_PUBLIC_FIREBASE_APP_ID: 'test' });
  const hot = await service.getStoveSnapshot(stove.deviceId);
  assert.equal(hot.isHot, true);
  assert.equal(hot.temperatureCelsius, 180);
  assert.equal(hot.hotSince, NOW - 90 * MINUTE);
  value = { stoveActive: true };
  assert.equal((await service.getStoveSnapshot(stove.deviceId)).isHot, false);
  await assert.rejects(service.sendDeviceCommand(stove.deviceId, 'OFF', 'app', 'stove'), /Only the AC/);
});
