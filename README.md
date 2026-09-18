# Home Guard

Home Guard is an iOS-first Expo app that watches a home geofence, checks connected appliance sensors, and supports remote AC control and warning-only stove alerts. It includes a complete mock mode, so the onboarding, dashboards, charts, commands, and notification flow can be demonstrated without hardware or a Firebase project.

**Gallery** &nbsp;·&nbsp; [Run / replicate](docs/RUN.md)

## Gallery

| Home | Home geofence |
| --- | --- |
| <img src="docs/screenshots/welcome-setup.png" width="280" alt="Home Guard welcome screen with setup and demo options"><br><sub>Set up a home step by step or explore the app with seeded demo data.</sub> | <img src="docs/screenshots/home-geofence.png" width="280" alt="Home setup map with a configurable geofence radius"><br><sub>Long-press the map to place the home pin, choose a radius, and confirm the geofence.</sub> |

| Home dashboard | Kitchen watch |
| --- | --- |
| <img src="docs/screenshots/home-dashboard.png" width="280" alt="Home dashboard showing room temperature and AC controls"><br><sub>Check presence, room temperature, sensor recency, and likely AC status, then turn the AC off remotely.</sub> | <img src="docs/screenshots/kitchen-watch.png" width="280" alt="Kitchen Watch screen showing a hot stove and sensor readings"><br><sub>See the stove's heat state, infrared temperature, and the most recent kitchen motion reading.</sub> |

| Cooking timer and safety checks | Environmental impact |
| --- | --- |
| <img src="docs/screenshots/cooking-timer.png" width="280" alt="Cooking timer and armed stove safety checks"><br><sub>Start a one-time timer for a longer cook while keeping departure alerts active.</sub> | <img src="docs/screenshots/impact-dashboard.png" width="280" alt="Impact dashboard with energy, cost, and carbon savings"><br><sub>Switch between time ranges to review energy, cost, and carbon savings from AC and stove interventions.</sub> |

| Settings |
| --- |
| <img src="docs/screenshots/settings.png" width="280" alt="Settings screen with monitoring, safety, sensor, and demo sections"><br><sub>Open grouped controls for location, AC monitoring, stove safety, sensors, alerts, and demo tools.</sub> |

| Actionable AC alert | Stove safety alert |
| --- | --- |
| <img src="docs/screenshots/ac-alert.png" width="280" alt="Actionable notification warning that the AC may still be on"><br><sub>Turn the AC off from the notification or keep it running without opening the app.</sub> | <img src="docs/screenshots/stove-alert.png" width="280" alt="Notification warning that the stove is hot with no recent kitchen motion"><br><sub>Check the kitchen in person, then acknowledge the warning or dismiss the notification.</sub> |
