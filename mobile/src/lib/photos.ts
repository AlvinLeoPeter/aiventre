import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PickedDrawing } from './drawing';

/**
 * Photos for the shop's profile PDF: machines, the shop floor, parts made. Kept on this phone
 * under their own key (not in the shop's data), so the synced data stays small; a few small
 * JPEGs fit comfortably in one stored item.
 */

export type PhotoKind = 'machine' | 'shop' | 'part';
export type ShopPhoto = { id: string; kind: PhotoKind; caption: string; data: string };

export const MAX_PHOTOS = 6;
export const PHOTO_EDGE = 800;
export const KIND_LABEL: Record<PhotoKind, string> = { machine: 'Machine', shop: 'Shop floor', part: 'Part we made' };

const KEY = 'aiventre:photos';
let photos: ShopPhoto[] = [];
const listeners = new Set<() => void>();

function set(next: ShopPhoto[]) {
  photos = next;
  listeners.forEach((l) => l());
  AsyncStorage.setItem(KEY, JSON.stringify(photos)).catch(() => {});
}

export async function loadPhotos() {
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null');
    if (Array.isArray(saved)) photos = saved;
  } catch {
    // Unreadable: start with none.
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const usePhotos = () => useSyncExternalStore(subscribe, () => photos, () => photos);
export const getPhotos = () => photos;

export function addPhoto(picked: PickedDrawing, kind: PhotoKind) {
  if (photos.length >= MAX_PHOTOS) return;
  set([...photos, { id: Math.random().toString(36).slice(2, 10), kind, caption: '', data: picked.data }]);
}

export const updatePhoto = (id: string, patch: Partial<Omit<ShopPhoto, 'id' | 'data'>>) => set(photos.map((p) => (p.id === id ? { ...p, ...patch } : p)));
export const removePhoto = (id: string) => set(photos.filter((p) => p.id !== id));
export const clearPhotos = () => set([]);
