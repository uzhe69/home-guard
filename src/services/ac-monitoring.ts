import AsyncStorage from '@react-native-async-storage/async-storage';

import { getDeviceSnapshot, getRoomTemperatureReadings } from '@/services/firebase';
import { cancelAcReminders, sendAcReminderNow } from '@/services/notifications';
import { getNearbyOutdoorTemperature } from '@/services/outdoor-temperature';
import { loadSettings } from '@/services/settings';
import type { AcDeviceSnapshot, AcMonitoringState, HomeSettings, RoomTemperatureReading } from '@/types/home-guard';

const STATE_KEY = 'home_guard.ac_monitoring.v1';
const MINUTE = 60_000;
const listeners = new Set<(state: AcMonitoringState) => void>();
let queue: Promise<unknown> = Promise.resolve();

export function emptyAcMonitoringState(): AcMonitoringState {
  return {
    departure: null, readings: [], outdoor: null, status: 'home',
    explanation: 'AC status needs fresh sensor readings.', estimatedCrossingMinutes: null,
    thermalDeviceId: null, thermalTimeConstantsMinutes: [], calibration: null, calibrationMessage: '',
  };
}

export async function loadAcMonitoringState(): Promise<AcMonitoringState> {
  const stored = await AsyncStorage.getItem(STATE_KEY);
  if (!stored) return emptyAcMonitoringState();
  try { return { ...emptyAcMonitoringState(), ...JSON.parse(stored) }; }
  catch { return emptyAcMonitoringState(); }
}

async function saveState(state: AcMonitoringState) {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
  listeners.forEach((listener) => listener(state));
  return state;
}

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const next = queue.then(operation);
  queue = next.catch(() => undefined);
  return next;
}

export function subscribeToAcMonitoring(listener: (state: AcMonitoringState) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function learnedThermalTimeConstant(state: AcMonitoringState): number | null {
  if (state.thermalTimeConstantsMinutes.length < 2) return null;
  const values = [...state.thermalTimeConstantsMinutes].sort((a, b) => a - b);
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
}

export function estimateThresholdCrossingMinutes(tau: number | null, outdoor: number, initial: number, threshold: number): number | null {
  if (tau === null || !Number.isFinite(tau) || tau <= 0 || ![outdoor, initial, threshold].every(Number.isFinite) || outdoor <= threshold) return null;
  if (initial >= threshold) return 0;
  return tau * Math.log((outdoor - initial) / (outdoor - threshold));
}

function mergeReadings(readings: RoomTemperatureReading[], incoming: RoomTemperatureReading[], now: number) {
  const merged = new Map<number, RoomTemperatureReading>();
  for (const reading of [...readings, ...incoming]) {
    if (!Number.isFinite(reading.temperatureCelsius) || !Number.isFinite(reading.timestamp) || reading.timestamp > now || reading.timestamp < now - 180 * MINUTE) continue;
    const minute = Math.floor(reading.timestamp / MINUTE);
    if (!merged.has(minute) || reading.timestamp > merged.get(minute)!.timestamp) merged.set(minute, reading);
  }
  return [...merged.values()].sort((a, b) => a.timestamp - b.timestamp).slice(-180);
}

function temperatureTrend(readings: RoomTemperatureReading[], timestamp: number) {
  const window = readings.filter((reading) => reading.timestamp >= timestamp - 15 * MINUTE && reading.timestamp <= timestamp);
  if (window.length < 3 || window.at(-1)!.timestamp - window[0].timestamp < 10 * MINUTE) return null;
  if (window.some((reading, index) => index > 0 && reading.timestamp - window[index - 1].timestamp > 5 * MINUTE)) return null;
  const meanTime = window.reduce((sum, reading) => sum + (reading.timestamp - window[0].timestamp) / MINUTE, 0) / window.length;
  const meanTemperature = window.reduce((sum, reading) => sum + reading.temperatureCelsius, 0) / window.length;
  let numerator = 0;
  let denominator = 0;
  for (const reading of window) {
    const time = (reading.timestamp - window[0].timestamp) / MINUTE - meanTime;
    numerator += time * (reading.temperatureCelsius - meanTemperature);
    denominator += time * time;
  }
  return { slope: numerator / denominator, change: window.at(-1)!.temperatureCelsius - window[0].temperatureCelsius };
}

function freshTemperature(snapshot: AcDeviceSnapshot, now: number) {
  return snapshot.connectionStatus === 'online' && Number.isFinite(snapshot.roomTemperatureCelsius) && snapshot.lastSeenAt <= now && now - snapshot.lastSeenAt <= 5 * MINUTE;
}

function freshPowerState(snapshot: AcDeviceSnapshot, now: number) {
  return snapshot.connectionStatus === 'online' && snapshot.powerStateUpdatedAt !== null && snapshot.powerStateUpdatedAt <= now && now - snapshot.powerStateUpdatedAt <= 5 * MINUTE ? snapshot.powerState : null;
}

export function recordAcReading(snapshot: AcDeviceSnapshot) {
  return serialize(async () => {
    const settings = await loadSettings();
    if (snapshot.deviceId !== settings.acDeviceId) return loadAcMonitoringState();
    const state = await loadAcMonitoringState();
    state.readings = mergeReadings(state.readings, [{ timestamp: snapshot.lastSeenAt, temperatureCelsius: snapshot.roomTemperatureCelsius }], Date.now());
    return saveState(state);
  });
}

export function beginAcDeparture(settings: HomeSettings) {
  return serialize(async () => {
    const state = await loadAcMonitoringState();
    const departedAt = settings.phoneDepartedAt;
    if (departedAt === null || (state.departure?.departedAt === departedAt && state.departure.deviceId === settings.acDeviceId)) return state;
    await cancelAcReminders();
    const [snapshot, outdoor, history] = await Promise.all([
      getDeviceSnapshot(settings.acDeviceId).catch(() => null),
      getNearbyOutdoorTemperature(settings.homeLocation),
      getRoomTemperatureReadings(settings.acDeviceId, departedAt - 15 * MINUTE).catch(() => []),
    ]);
    if ((await loadSettings()).phoneDepartedAt !== departedAt) return state;
    if (state.thermalDeviceId !== settings.acDeviceId) {
      state.readings = [];
      state.thermalTimeConstantsMinutes = [];
      state.thermalDeviceId = settings.acDeviceId;
    }
    state.readings = mergeReadings(state.readings, [...history, ...(snapshot ? [{ timestamp: snapshot.lastSeenAt, temperatureCelsius: snapshot.roomTemperatureCelsius }] : [])], Date.now());
    state.departure = {
      deviceId: settings.acDeviceId, departedAt,
      temperatureAtDeparture: snapshot && freshTemperature(snapshot, Date.now()) ? snapshot.roomTemperatureCelsius : null,
      thresholdCelsius: settings.temperatureThresholdCelsius, outdoorAtDeparture: outdoor,
      lastEvaluatedThresholdCelsius: settings.temperatureThresholdCelsius,
      recentReadings: state.readings.filter((reading) => reading.timestamp <= departedAt),
      consecutiveOnReadings: 0, lastEvaluatedReadingAt: null, alertSent: false,
    };
    state.outdoor = outdoor;
    if (state.calibration) {
      state.calibration = null;
      state.calibrationMessage = 'Calibration stopped because you left home. Repeat with the AC off when you return.';
    }
    state.status = 'waiting';
    state.explanation = settings.acDelayMode === 'smart' ? 'Smart checks begin after 20 minutes, allowing residual cooling to fade.' : `We’ll check fresh readings after ${settings.reminderDelayMinutes} minutes.`;
    state.estimatedCrossingMinutes = null;
    return saveState(state);
  });
}

export function cancelAcDeparture() {
  return serialize(async () => {
    await cancelAcReminders();
    const state = await loadAcMonitoringState();
    state.departure = null;
    state.status = 'home';
    state.explanation = 'You’re home. The pending AC check has been canceled.';
    state.estimatedCrossingMinutes = null;
    return saveState(state);
  });
}

function observeCalibration(state: AcMonitoringState, snapshot: AcDeviceSnapshot, now: number) {
  const calibration = state.calibration;
  if (!calibration) return;
  const elapsed = (snapshot.lastSeenAt - calibration.startedAt) / MINUTE;
  const power = freshPowerState(snapshot, now);
  if (power === 'ON' || now - calibration.startedAt > 120 * MINUTE || (state.outdoor && Math.abs(state.outdoor.temperatureCelsius - calibration.outdoorAtStart.temperatureCelsius) > 2)) {
    state.calibration = null;
    state.calibrationMessage = 'Calibration stopped. Repeat with the AC off and steadier outdoor conditions.';
    return;
  }
  const readings = state.readings.filter((reading) => reading.timestamp >= calibration.startedAt);
  const trend = temperatureTrend(readings, snapshot.lastSeenAt);
  if (!freshTemperature(snapshot, now) || elapsed < 20 || !trend || trend.slope <= 0.005 || snapshot.roomTemperatureCelsius - calibration.temperatureAtStart < 0.5) return;
  const outdoor = calibration.outdoorAtStart.temperatureCelsius;
  const estimates = readings.filter((reading) => reading.timestamp - calibration.startedAt >= 10 * MINUTE && reading.temperatureCelsius - calibration.temperatureAtStart >= 0.3 && outdoor - reading.temperatureCelsius > 0.3)
    .map((reading) => -(reading.timestamp - calibration.startedAt) / MINUTE / Math.log((outdoor - reading.temperatureCelsius) / (outdoor - calibration.temperatureAtStart)))
    .filter((tau) => Number.isFinite(tau) && tau > 0);
  if (estimates.length < 3) return;
  estimates.sort((a, b) => a - b);
  const tau = estimates[Math.floor(estimates.length / 2)];
  if (estimates.some((estimate) => Math.abs(estimate - tau) / tau > 0.5)) return;
  state.thermalTimeConstantsMinutes = [...state.thermalTimeConstantsMinutes.slice(-7), tau];
  state.calibration = null;
  state.calibrationMessage = state.thermalTimeConstantsMinutes.length < 2 ? 'First shut-off event saved. Repeat once more to learn this room’s warming rate.' : 'Room warming rate learned. Repeat calibration over time to refine it.';
}

export function startAcCalibration() {
  return serialize(async () => {
    const settings = await loadSettings();
    if (settings.phoneDepartedAt !== null) throw new Error('Return home before calibrating.');
    const [snapshot, outdoor] = await Promise.all([getDeviceSnapshot(settings.acDeviceId), getNearbyOutdoorTemperature(settings.homeLocation)]);
    if ((await loadSettings()).phoneDepartedAt !== null) throw new Error('Return home before calibrating.');
    if (!freshTemperature(snapshot, Date.now()) || !outdoor || outdoor.temperatureCelsius - snapshot.roomTemperatureCelsius < 1) throw new Error('Calibration needs a fresh room reading and outdoor air at least 1°C warmer than the room.');
    if (freshPowerState(snapshot, Date.now()) === 'ON') throw new Error('Switch off the AC before starting calibration.');
    const state = await loadAcMonitoringState();
    if (state.thermalDeviceId !== settings.acDeviceId) state.thermalTimeConstantsMinutes = [];
    state.thermalDeviceId = settings.acDeviceId;
    state.readings = [{ timestamp: snapshot.lastSeenAt, temperatureCelsius: snapshot.roomTemperatureCelsius }];
    state.outdoor = outdoor;
    state.calibration = { deviceId: settings.acDeviceId, startedAt: Date.now(), temperatureAtStart: snapshot.roomTemperatureCelsius, outdoorAtStart: outdoor };
    state.calibrationMessage = 'Observing natural warming for at least 20 minutes. Keep the AC off and ventilation unchanged.';
    return saveState(state);
  });
}

export function stopAcCalibration() {
  return serialize(async () => {
    const state = await loadAcMonitoringState();
    state.calibration = null;
    state.calibrationMessage = 'Calibration canceled. You can try again later.';
    return saveState(state);
  });
}

export function evaluateAcMonitoring() {
  return serialize(async () => {
    const settings = await loadSettings();
    const state = await loadAcMonitoringState();
    if (!state.departure && !state.calibration) return state;
    if (state.calibration && state.calibration.deviceId !== settings.acDeviceId) state.calibration = null;
    if (state.departure && (settings.phoneDepartedAt === null || state.departure.deviceId !== settings.acDeviceId)) {
      await cancelAcReminders();
      state.departure = null;
      state.status = 'home';
      return saveState(state);
    }
    const [snapshot, outdoor, history] = await Promise.all([
      getDeviceSnapshot(settings.acDeviceId).catch(() => null),
      getNearbyOutdoorTemperature(settings.homeLocation),
      getRoomTemperatureReadings(settings.acDeviceId, Date.now() - 180 * MINUTE).catch(() => []),
    ]);
    const now = Date.now();
    state.outdoor = outdoor;
    state.readings = mergeReadings(state.readings, [...history, ...(snapshot ? [{ timestamp: snapshot.lastSeenAt, temperatureCelsius: snapshot.roomTemperatureCelsius }] : [])], now);
    if (snapshot) observeCalibration(state, snapshot, now);
    const departure = state.departure;
    if (!departure) return saveState(state);
    const delay = settings.acDelayMode === 'smart' ? 20 : settings.reminderDelayMinutes;
    const elapsed = (now - departure.departedAt) / MINUTE;
    const threshold = settings.temperatureThresholdCelsius;
    if (departure.lastEvaluatedThresholdCelsius !== threshold) {
      departure.lastEvaluatedThresholdCelsius = threshold;
      departure.consecutiveOnReadings = 0;
      departure.lastEvaluatedReadingAt = null;
    }
    state.estimatedCrossingMinutes = outdoor && outdoor.temperatureCelsius > threshold && departure.outdoorAtDeparture && Math.abs(outdoor.temperatureCelsius - departure.outdoorAtDeparture.temperatureCelsius) <= 2 && departure.temperatureAtDeparture !== null
      ? estimateThresholdCrossingMinutes(learnedThermalTimeConstant(state), departure.outdoorAtDeparture.temperatureCelsius, departure.temperatureAtDeparture, threshold) : null;
    const power = snapshot ? freshPowerState(snapshot, now) : null;
    if (power === 'OFF') {
      state.status = 'off';
      state.explanation = 'The AC reports that its power is off.';
      departure.consecutiveOnReadings = 0;
    } else if (elapsed < delay) {
      state.status = 'waiting';
      state.explanation = `Checks start ${delay} minutes after departure. No early alert will be sent.`;
    } else if (power === 'ON') {
      state.status = 'likely-on';
      state.explanation = 'Fresh AC power-state data confirms that the AC is on.';
    } else if (!snapshot || !freshTemperature(snapshot, now) || !outdoor || outdoor.temperatureCelsius <= threshold) {
      state.status = 'unable-to-verify';
      state.explanation = outdoor && outdoor.temperatureCelsius <= threshold ? 'Low confidence: outdoor air is at or below your threshold, so room temperature cannot establish whether the AC is on.' : 'Low confidence: fresh room or nearby outdoor readings are unavailable.';
      departure.consecutiveOnReadings = 0;
    } else if (snapshot.roomTemperatureCelsius >= threshold) {
      state.status = 'off';
      state.explanation = 'The room is at or above your threshold. No temperature-based AC alert is needed.';
      departure.consecutiveOnReadings = 0;
    } else {
      const trend = temperatureTrend(state.readings.filter((reading) => reading.timestamp >= departure.departedAt), snapshot.lastSeenAt);
      if (!trend) {
        state.status = 'unable-to-verify';
        state.explanation = 'Low confidence: waiting for readings spanning at least 10 minutes, without gaps over 5 minutes.';
        departure.consecutiveOnReadings = 0;
      } else if (trend.slope > 0.01 && trend.change >= 0.15 && outdoor.temperatureCelsius > snapshot.roomTemperatureCelsius) {
        state.status = 'warming';
        state.explanation = 'The room is warming toward outdoor air. Residual cooling may explain the low temperature; the alert is postponed.';
        departure.consecutiveOnReadings = 0;
      } else if (trend.slope > 0.005 || trend.change > 0.15) {
        state.status = 'unable-to-verify';
        state.explanation = 'Low confidence: the room’s warming trend is not yet clear. We’ll keep observing.';
        departure.consecutiveOnReadings = 0;
      } else if (settings.acDelayMode === 'smart' && state.estimatedCrossingMinutes !== null && elapsed < state.estimatedCrossingMinutes) {
        state.status = 'waiting';
        state.explanation = `This room can retain cooling for about ${Math.ceil(state.estimatedCrossingMinutes)} minutes after shut-off. We’ll wait and check the trend again.`;
        departure.consecutiveOnReadings = 0;
      } else {
        if (departure.lastEvaluatedReadingAt === null || snapshot.lastSeenAt - departure.lastEvaluatedReadingAt >= MINUTE) {
          if (departure.lastEvaluatedReadingAt !== null && snapshot.lastSeenAt - departure.lastEvaluatedReadingAt > 5 * MINUTE) departure.consecutiveOnReadings = 0;
          departure.consecutiveOnReadings += 1;
          departure.lastEvaluatedReadingAt = snapshot.lastSeenAt;
        }
        state.status = departure.consecutiveOnReadings >= 3 ? 'likely-on' : 'waiting';
        state.explanation = state.status === 'likely-on' ? 'Several fresh readings confirm that the room remains below your threshold and is stable or cooling.' : `Confirming stable or cooling conditions (${departure.consecutiveOnReadings}/3 consecutive readings).`;
      }
    }
    if (state.status === 'likely-on' && settings.notificationsEnabled && !departure.alertSent && snapshot) {
      const current = await loadSettings();
      if (current.phoneDepartedAt === departure.departedAt && current.notificationsEnabled && current.acDeviceId === departure.deviceId && current.temperatureThresholdCelsius === threshold && current.acDelayMode === settings.acDelayMode && current.reminderDelayMinutes === settings.reminderDelayMinutes) {
        await sendAcReminderNow({ deviceId: departure.deviceId, temperatureCelsius: snapshot.roomTemperatureCelsius, powerConfirmed: power === 'ON' });
        departure.alertSent = true;
        const afterAlert = await loadSettings();
        if (afterAlert.phoneDepartedAt !== departure.departedAt || !afterAlert.notificationsEnabled) await cancelAcReminders();
      }
    }
    return saveState(state);
  });
}

export function resetAcMonitoring() {
  return serialize(async () => {
    await cancelAcReminders();
    return saveState(emptyAcMonitoringState());
  });
}
