# Home Guard

Home Guard is an iOS-first Expo app that watches a home geofence, checks connected appliance sensors, and supports remote AC control and warning-only stove alerts. It includes a complete mock mode, so the onboarding, dashboards, charts, commands, and notification flow can be demonstrated without hardware or a Firebase project.

## Stack

- Expo SDK 55, React Native 0.83, TypeScript, and Expo Router
- NativeWind 4 with source-owned React Native Reusables-style UI primitives
- `react-native-maps`, `expo-location`, and `expo-task-manager`
- `expo-notifications`, `expo-secure-store`, SF Symbols, and iOS haptics
- Firebase Anonymous Authentication and Realtime Database
- Reanimated and SVG for animated gauges, charts, and transitions

## Run on an iPhone

Requirements: current Xcode, CocoaPods, an Apple development team configured in Xcode, and an iPhone connected and trusted by the Mac.

```bash
npm install
npx expo run:ios --device
```

The native project is generated automatically and intentionally ignored by Git. This app requires a Development Build; background geofencing and actionable notification behavior cannot be validated fully in Expo Go.

On the phone, allow notifications and choose **Always Allow** for location when prompted. If iOS initially offers only **While Using the App**, enable **Always** later under Settings → Privacy & Security → Location Services → Home Guard.

## Demo mode

No configuration is required. When Firebase environment values are absent, the app uses a seeded bedroom sensor at 22.4°C with realistic history and impact data.

Open **Settings → Developer demo controls** to:

- simulate leaving the home geofence;
- inject 19.8°C, 22.4°C, or 27.2°C room readings;
- deliver the actionable AC alert immediately;
- test the `Turn It Off` command without hardware.

Smart delay is the default for **Simulate leaving home**. It requires fresh, timestamped readings and does not synthesize a warming trend in mock mode. Use **Send AC alert now** for presentations.

## Firebase setup

Copy `.env.example` to `.env.local` and add the web-app configuration from the Firebase console:

```bash
cp .env.example .env.local
```

Enable Anonymous Authentication and create a Realtime Database. Home Guard reads this shape:

```json
{
  "devices": {
    "bedroom-ac": {
      "connected": true,
      "telemetry": {
        "temperatureCelsius": 22.4,
        "lastSeenAt": 1789261200000
      },
      "commands": {
        "latest": {
          "value": "OFF",
          "requestedAt": 1789261200000,
          "requestedBy": "anonymous-user-id",
          "source": "app"
        }
      }
    }
  }
}
```

For a prototype database, authenticated users can be scoped to the device tree:

```json
{
  "rules": {
    "devices": {
      "$deviceId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

Use device ownership claims and narrower telemetry/command rules before production.

## Stove detection

The stove attachment reports infrared temperature and motion. It cannot switch the stove off remotely; stove notifications and the stove screen offer only **Acknowledge** and **Dismiss** actions. AC remote control remains available.

In **Settings**, choose a motion-inactivity threshold of **30, 60, or 90 minutes**, or save a custom positive whole number of minutes. An inactivity alert requires infrared heat throughout the selected duration and no motion during that duration. The interval starts at the later of `hotSince` and `lastMotionAt`; `stoveActive` alone never triggers an alert.

In **Kitchen watch**, start an optional one-time cooking timer for longer unattended cooking. It suppresses inactivity alerts until its deadline, then normal checks resume. New motion still resets the normal interval. Canceling the timer restores normal checks immediately, and cooling clears the timer.

Stove departure alerts use a separate **2, 3, or 5 minute** delay after the user's phone exits the configured geofence, independent of motion and cooking timers. They use iOS time-sensitive delivery and Android high priority. Returning inside the geofence or observing cooling cancels a pending departure alert.

The stove must publish these fields under `devices/kitchen-stove/telemetry` (top-level fields are also accepted):

```json
{
  "isHot": true,
  "temperatureCelsius": 180,
  "hotSince": 1789261200000,
  "lastMotionAt": 1789262400000,
  "lastSeenAt": 1789262500000
}
```

`isHot` is the attachment's calibrated infrared heat classification, not a burner command or gas-flow reading. `hotSince` is the start of the current continuous hot interval, and resets after cooling; timestamps use epoch milliseconds. Missing heat classification does not fall back to a demo hot reading.

The app schedules native one-shot alerts from the latest telemetry and reschedules or cancels them when it receives motion, cooling, timer, or preference changes. Native scheduling can deliver while JavaScript is suspended, but Firebase subscriptions cannot keep processing sensor updates while the app is suspended or terminated. Guaranteed continuous background evaluation and cancellation on new sensor data require device-side or trusted backend monitoring with push delivery. Physical-device location and notification behavior still need on-device verification.

## AC detection and calibration

The **AC temperature threshold** defaults to **26°C**, with quick options of **24, 25, and 26°C** and custom values from **18–28°C in 0.5°C increments**. It is the measured room-temperature threshold below which a room may still be air-conditioned; it is not necessarily the AC remote’s selected temperature.

**Smart delay — Recommended** is the default. Fixed alternatives are **20, 30, 45, 60, or 90 minutes**, with custom whole-minute delays from **20–120 minutes**. The default fixed fallback is **30 minutes**. Old or invalid delays below 20 minutes migrate to 30 minutes, and old installations without a delay mode use Smart delay. The home radius defaults to **100 m**, with **100, 200, and 300 m** presets and a custom positive whole-meter radius.

On departure, the app saves the room temperature, chosen threshold, nearby outdoor temperature, and recent timestamped room readings. Nearby outdoor air is obtained from the closest reporting NEA station through [data.gov.sg’s real-time temperature API](https://api-open.data.gov.sg/v2/real-time/api/air-temperature). Outdoor readings older than 20 minutes and room readings older than 5 minutes are not used to establish AC status.

Smart checks begin after 20 minutes. Fixed mode begins checks at the selected delay; it also checks fresh data before notifying. A regression window must span at least 10 minutes, contain at least three readings, and have no gaps greater than 5 minutes. A clearly positive trend toward warmer outdoor air postpones the alert even when the room remains below the threshold. Stable or cooling conditions must qualify on three consecutive fresh readings at least a minute apart; repeated reads of the same telemetry timestamp do not count. Returning home cancels the departure check and cancels or dismisses its AC notifications. Only one AC alert is sent per departure.

The dashboard displays **Unable to verify AC status** with a low-confidence explanation if outdoor air is at or below the threshold, weather or room data is unavailable, or the trend is inconclusive. A command requesting `ON` or `OFF` is never treated as proof of actual AC power state. Optional direct telemetry can establish status independently of room temperature:

```json
{
  "powerState": "ON",
  "powerStateUpdatedAt": 1789262500000
}
```

Publish this under `devices/bedroom-ac/telemetry` (top-level fields are also accepted), updating the timestamp with each actual power-state observation. Direct readings must be no older than 5 minutes. Even confirmed-on alerts wait until the selected departure delay.

To supply history during background checks, the attachment should append readings under `devices/bedroom-ac/temperatureReadings/{readingId}`:

```json
{
  "timestamp": 1789262500000,
  "temperatureCelsius": 22.4
}
```

Use epoch milliseconds and publish roughly every minute, including unchanged temperatures. Add `".indexOn": ["timestamp"]` to the database rules for the `temperatureReadings` node. The app also retains timestamped telemetry received while running; it never fills missing samples with invented readings.

Optional calibration is available during setup and in Settings. Manually switch off the AC and start calibration, leaving ventilation unchanged. The app observes natural warming for at least 20 minutes, requires a measurable temperature rise and consistent first-order estimates, and saves one thermal time constant per shut-off event. Repeat on separate events: the median of at least two successful events is used for future Smart checks, with up to eight recent events retained per sensor. Leaving home, detected AC power-on, substantially changing outdoor conditions, or exceeding two hours stops the current event. Rooms that do not warm enough cannot be calibrated from that event.

The supporting first-order estimate is:

```text
t_cross = τ × ln((T_out − T₀) / (T_out − T_threshold))
```

Here `τ` is the learned thermal time constant in minutes. The app waits through the estimated residual-cooling period before confirming temperature-based Smart alerts, then still requires the trend and consecutive readings. It does not calculate this estimate when `T_out ≤ T_threshold`, when departure data or calibration is missing, or when outdoor conditions have shifted substantially. HDB flats, condos, and landed homes can warm differently because of room size, walls, ventilation, sun exposure, and thermal mass.

## Background flow

1. Settings are saved in Keychain-backed SecureStore; departure readings and calibration are persisted separately in AsyncStorage.
2. Expo Location registers the module-scope `home-guard-geofence` task.
3. On exit, the task captures AC departure conditions and enables background location updates for AC checks. Stove alerts retain their separate departure delay.
4. The module-scope `home-guard-ac-monitoring` task fetches fresh telemetry and history during background execution windows. The foreground app also checks every minute and on resume.
5. Only a qualifying check sends the actionable AC notification. **Turn It Off** writes `OFF` to `devices/{deviceId}/commands/latest`.
6. Geofence entry cancels the pending AC check and stops background AC location updates. Background AC updates also stop after an alert when calibration is inactive.

Expo SDK 55’s location task supplies execution opportunities, not a guaranteed timer: Android’s `timeInterval` is a minimum interval, and iOS controls location-event delivery. No alert is pre-scheduled from a stale departure reading. Suspended or terminated apps may check later than the selected delay. Guaranteed continuous evaluation, exact-time checks, and fresh sensor-based cancellation while the app is terminated require attachment-side or trusted backend monitoring with push delivery. See the [Expo 55 Location documentation](https://docs.expo.dev/versions/v55.0.0/sdk/location/).

## Checks

```bash
npm run lint
npm run typecheck
node --test tests/stove-detection.test.cjs
npm run doctor
npx expo export --platform ios
```
