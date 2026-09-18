# Run Home Guard locally

[Gallery](../README.md) &nbsp;·&nbsp; **Run / replicate**

Home Guard uses Expo SDK 55, React Native 0.83, TypeScript, and Expo Router. It runs with seeded demo data by default, so Firebase and physical sensors are optional.

## Run on an iOS Simulator

Requirements: Node.js 20.19 or newer, Xcode 26.2 or newer, and CocoaPods.

```bash
npm ci
npm run ios
```

The first run generates the native iOS project and starts a Development Build in the simulator. Choose **Explore the demo** to use the app without Firebase or hardware.

For an Android emulator with Android Studio and Android SDK 36 configured:

```bash
npm run android
```

## Run on a physical iPhone

Background geofencing and actionable notification behavior need a Development Build on a physical device for complete testing. Configure an Apple development team in Xcode, connect and trust the iPhone, then run:

```bash
npm run ios:device
```

Allow notifications and choose **Always Allow** for location when prompted. If iOS initially offers only **While Using the App**, enable **Always** later under Settings → Privacy & Security → Location Services → Home Guard.

## Demo mode

No configuration is required. Without Firebase environment values, the app uses seeded AC, stove, impact, and alert data.

Open **Settings → Developer demo controls** to simulate leaving home, change room readings, send an AC alert, or test the `Turn It Off` command.

## Firebase setup

Copy the example environment file and add the Firebase web-app configuration:

```bash
cp .env.example .env.local
```

Enable Anonymous Authentication and create a Realtime Database. For a prototype, authenticated users can be scoped to the device tree:

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

Use device ownership claims and narrower telemetry and command rules before production.

### AC telemetry

Publish the latest reading under `devices/bedroom-ac/telemetry`:

```json
{
  "temperatureCelsius": 22.4,
  "lastSeenAt": 1789262500000,
  "powerState": "ON",
  "powerStateUpdatedAt": 1789262500000
}
```

`powerState` and `powerStateUpdatedAt` are optional direct observations. To support Smart delay checks, append roughly one reading per minute under `devices/bedroom-ac/temperatureReadings/{readingId}`:

```json
{
  "timestamp": 1789262500000,
  "temperatureCelsius": 22.4
}
```

Add `".indexOn": ["timestamp"]` to the database rules for the `temperatureReadings` node.

AC off commands are written to `devices/{deviceId}/commands/latest`:

```json
{
  "value": "OFF",
  "requestedAt": 1789262500000,
  "requestedBy": "anonymous-user-id",
  "source": "app"
}
```

### Stove telemetry

Publish stove readings under `devices/kitchen-stove/telemetry`:

```json
{
  "isHot": true,
  "temperatureCelsius": 180,
  "hotSince": 1789261200000,
  "lastMotionAt": 1789262400000,
  "lastSeenAt": 1789262500000
}
```

`isHot` is the attachment's calibrated infrared heat classification, not a burner command or gas-flow reading. Timestamps use epoch milliseconds.

## Behavior and limitations

- Stove safety is warning-only. The app can remotely request that the AC turn off, but it cannot switch off the stove.
- Smart AC checks use fresh room readings, nearby outdoor temperature, and an optional learned thermal calibration. They do not infer actual power state from the last command.
- Native one-shot alerts can fire while JavaScript is suspended, but Firebase subscriptions cannot continuously process sensor updates after the app is suspended or terminated.
- Expo location tasks provide background execution opportunities, not guaranteed timers. Continuous monitoring and exact-time evaluation require attachment-side or trusted backend processing with push delivery.

See the [Expo SDK 55 Location documentation](https://docs.expo.dev/versions/v55.0.0/sdk/location/) for platform limits.

## Stack

- Expo SDK 55, React Native 0.83, TypeScript, and Expo Router
- NativeWind 4 with source-owned React Native Reusables-style UI primitives
- `react-native-maps`, `expo-location`, and `expo-task-manager`
- `expo-notifications`, `expo-secure-store`, SF Symbols, and iOS haptics
- Firebase Anonymous Authentication and Realtime Database
- Reanimated and SVG for animated gauges, charts, and transitions

## Checks

```bash
npm run lint
npm run typecheck
node --test tests/stove-detection.test.cjs
npm run doctor
npx expo export --platform ios
```
