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

The configured reminder delay still applies to **Simulate leaving home**. Use **Send AC alert now** for presentations.

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

## Background flow

1. The home settings are saved in iOS Keychain-backed SecureStore.
2. Expo Location registers a region with the module-scope `home-guard-geofence` task.
3. On exit, the task reads the latest Firebase temperature while iOS grants background execution time.
4. If the room is below the configured threshold, a local notification is scheduled for the reminder delay.
5. **Turn It Off** writes `OFF` to `devices/{deviceId}/commands/latest`; **Keep It On** dismisses the reminder.

iOS does not guarantee that JavaScript can wake at an exact arbitrary time after a region event. For that reason, the temperature is retrieved during the geofence execution window and delivery is delayed locally. A guaranteed fresh Firebase read exactly after the delay requires a trusted backend scheduler that sends a push notification.

## Checks

```bash
npm run lint
npm run typecheck
node --test tests/stove-detection.test.cjs
npm run doctor
npx expo export --platform ios
```
