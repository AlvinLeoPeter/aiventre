import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import type { Drawing } from './api';

/**
 * Getting a drawing onto the phone and into a form the AI can read (base64).
 * Photos are shrunk to 2000 px on the long side: the AI reads them at about that size
 * anyway, and it keeps uploads small on a slow connection.
 */

export type PickedDrawing = Drawing & { preview?: string };

// The server accepts about 4.5 MB per request, and base64 adds a third.
const MAX_MB = 3;
const LONG_EDGE = 2000;

const tooBig = (base64: string) => (base64.length * 3) / 4 > MAX_MB * 1024 * 1024;

// Chat photos (a worn insert, a bad finish) need less detail than drawings, and a chat sends several.
export const CHAT_EDGE = 1280;

async function fromImage(asset: ImagePicker.ImagePickerAsset, edge: number): Promise<PickedDrawing> {
  const long = Math.max(asset.width, asset.height);
  const ctx = ImageManipulator.manipulate(asset.uri);
  if (long > edge) ctx.resize(asset.width >= asset.height ? { width: edge } : { height: edge });
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  if (!saved.base64) throw new Error('Could not read that photo. Try another one.');
  if (tooBig(saved.base64)) throw new Error(`That photo is over ${MAX_MB} MB even after shrinking. Try a closer crop.`);
  return { name: asset.fileName || 'Drawing photo', mediaType: 'image/jpeg', data: saved.base64, preview: saved.uri };
}

export async function takePhoto(edge = LONG_EDGE): Promise<PickedDrawing | null> {
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (!granted) throw new Error('Camera access is off. Turn it on for Aiventre in your phone’s settings.');
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
  return result.canceled ? null : fromImage(result.assets[0], edge);
}

export async function choosePhoto(edge = LONG_EDGE): Promise<PickedDrawing | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  return result.canceled ? null : fromImage(result.assets[0], edge);
}

export async function choosePdf(): Promise<PickedDrawing | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.size && asset.size > MAX_MB * 1024 * 1024) {
    throw new Error(`That PDF is over ${MAX_MB} MB. Send just the page with the drawing.`);
  }
  // On the web the picker hands back a data URL; on phones we read the file.
  const data = asset.base64 ? asset.base64.replace(/^data:[^,]*,/, '') : await new File(asset.uri).base64();
  if (tooBig(data)) throw new Error(`That PDF is over ${MAX_MB} MB. Send just the page with the drawing.`);
  return { name: asset.name, mediaType: 'application/pdf', data };
}
