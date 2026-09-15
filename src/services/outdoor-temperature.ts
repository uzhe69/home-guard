import type { GeoPoint, OutdoorTemperature } from '@/types/home-guard';

export function distanceMeters(a: GeoPoint, b: GeoPoint) {
  const radians = Math.PI / 180;
  const latitude = (b.latitude - a.latitude) * radians;
  const longitude = (b.longitude - a.longitude) * radians;
  const h = Math.sin(latitude / 2) ** 2 + Math.cos(a.latitude * radians) * Math.cos(b.latitude * radians) * Math.sin(longitude / 2) ** 2;
  return 6_371_000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

type NeaResponse = {
  code: number;
  data?: {
    stations: { id: string; name: string; location: GeoPoint }[];
    readings: { timestamp: string; data: { stationId: string; value: number }[] }[];
  };
};

let cached: { location: GeoPoint; fetchedAt: number; reading: OutdoorTemperature } | null = null;

export async function getNearbyOutdoorTemperature(location: GeoPoint | null): Promise<OutdoorTemperature | null> {
  if (!location) return null;
  if (cached && Date.now() - cached.fetchedAt < 5 * 60_000 && Date.now() - cached.reading.timestamp <= 20 * 60_000 && distanceMeters(location, cached.location) < 100) return cached.reading;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch('https://api-open.data.gov.sg/v2/real-time/api/air-temperature', { signal: controller.signal });
    if (!response.ok) return null;
    const payload = await response.json() as NeaResponse;
    if (payload.code !== 0 || !payload.data) return null;
    const latest = [...payload.data.readings].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0];
    if (!latest) return null;
    const timestamp = Date.parse(latest.timestamp);
    if (!Number.isFinite(timestamp) || timestamp > Date.now() + 60_000 || Date.now() - timestamp > 20 * 60_000) return null;
    const stations = payload.data.stations
      .filter((station) => Number.isFinite(station.location.latitude) && Number.isFinite(station.location.longitude) && latest.data.some((reading) => reading.stationId === station.id && Number.isFinite(reading.value)))
      .sort((a, b) => distanceMeters(location, a.location) - distanceMeters(location, b.location));
    const station = stations[0];
    if (!station || distanceMeters(location, station.location) > 30_000) return null;
    const reading = { temperatureCelsius: latest.data.find((item) => item.stationId === station.id)!.value, timestamp, stationName: station.name };
    cached = { location, fetchedAt: Date.now(), reading };
    return reading;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
