# AC Guard

AC Guard is an iOS-first Expo app that watches a home geofence, checks a room sensor, and lets the user send an AC `OFF` command from an actionable notification. It includes a complete mock mode, so the onboarding, dashboard, charts, commands, and notification flow can be demonstrated without hardware or a Firebase project.

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

On the phone, allow notifications and choose **Always Allow** for location when prompted. If iOS initially offers only **While Using the App**, enable **Always** later under Settings → Privacy & Security → Location Services → AC Guard.

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

Enable Anonymous Authentication and create a Realtime Database. AC Guard reads this shape:

```json
{
  "devices": {
    "bedroom-ac-guard": {
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

## Background flow

1. The home settings are saved in iOS Keychain-backed SecureStore.
2. Expo Location registers a region with the module-scope `ac-guard-home-geofence` task.
3. On exit, the task reads the latest Firebase temperature while iOS grants background execution time.
4. If the room is below the configured threshold, a local notification is scheduled for the reminder delay.
5. **Turn It Off** writes `OFF` to `devices/{deviceId}/commands/latest`; **Keep It On** dismisses the reminder.

iOS does not guarantee that JavaScript can wake at an exact arbitrary time after a region event. For that reason, the temperature is retrieved during the geofence execution window and delivery is delayed locally. A guaranteed fresh Firebase read exactly after the delay requires a trusted backend scheduler that sends a push notification.

## Checks

```bash
npm run lint
npm run typecheck
npm run doctor
npx expo export --platform ios
```
