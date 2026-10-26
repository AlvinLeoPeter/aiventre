import * as Location from 'expo-location';

import type { Shop } from './model';

export type Place = Partial<Pick<Shop, 'area' | 'city' | 'state' | 'pincode' | 'lat' | 'lng'>> & { accuracy?: number };

/**
 * Where the shop is, from the phone's GPS — asked only when the owner taps the button.
 * The address is a best guess from the map, so every field stays editable.
 */
export async function locateShop(): Promise<Place> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) throw new Error('Location is off for Aiventre. Type the address below, or turn location on in your phone’s settings.');

  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { latitude: lat, longitude: lng, accuracy } = pos.coords;
  const place: Place = { lat, lng, accuracy: accuracy ?? undefined };

  try {
    const [a] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (a) {
      const city = a.city || a.subregion || '';
      const area = [a.district, a.name, a.street].find((x) => x && x !== city && !/^\d+$/.test(x)) || '';
      Object.assign(place, { area, city, state: a.region || '', pincode: a.postalCode || '' });
    }
  } catch {
    // No address lookup (e.g. offline): keep the pin, the owner types the rest.
  }
  return place;
}
