import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { auth, storage } from './firebase';

/**
 * Upload a local file URI (file://...) to Firebase Storage.
 * Returns the public download URL.
 */
export async function uploadFile(uid: string, localUri: string, folder: string, contentType = 'image/jpeg'): Promise<string> {
  if (!auth.currentUser) {
    throw new Error('You must be signed in to upload files.');
  }
  if (auth.currentUser.uid !== uid) {
    throw new Error('Auth user mismatch — refusing to upload.');
  }

  let blob: Blob;
  try {
    blob = await uriToBlob(localUri);
  } catch (e: any) {
    throw new Error(`Could not read the local file: ${e?.message ?? e}`);
  }

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const objectPath = `users/${uid}/${folder}/${fileName}`;
  const r = ref(storage, objectPath);

  try {
    await uploadBytes(r, blob, { contentType });
    return await getDownloadURL(r);
  } catch (e: any) {
    // storage/unknown is a catch-all; the real cause is in serverResponse.
    const code: string | undefined = e?.code;
    const serverResp: string | undefined =
      e?.customData?.serverResponse ?? e?.serverResponse;
    console.error('[storage] upload failed', {
      code,
      message: e?.message,
      serverResponse: serverResp,
      bucket: storage.app.options.storageBucket,
      objectPath,
      uid,
    });
    throw new Error(humanizeStorageError(code, serverResp, e?.message));
  }
}

function humanizeStorageError(code?: string, serverResp?: string, fallback?: string): string {
  const c = code ?? '';
  if (c.includes('unauthorized')) {
    return 'Storage rules denied the upload. Check Firebase Console → Storage → Rules.';
  }
  if (c.includes('quota-exceeded')) return 'Storage quota exceeded for this project.';
  if (c.includes('canceled')) return 'Upload was cancelled.';
  if (c.includes('object-not-found')) return 'Storage object missing after upload.';
  if (c.includes('retry-limit-exceeded')) return 'Upload timed out — check your network.';
  if (serverResp) {
    // Firebase puts the real error here for storage/unknown — e.g.
    // "Bucket pawproof-foo.firebasestorage.app does not exist."
    return serverResp.slice(0, 300);
  }
  return fallback ?? 'Upload failed.';
}

/** Optimise an image before upload (resize + recompress JPEG). */
export async function compressImage(uri: string, maxWidth = 1600, quality = 0.8): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

export async function uploadCompressedPhoto(uid: string, localUri: string, folder: string): Promise<string> {
  const compressed = await compressImage(localUri);
  return uploadFile(uid, compressed, folder, 'image/jpeg');
}

export async function uriToBlob(uri: string): Promise<Blob> {
  // Use XHR — fetch(file://) is unreliable on some RN runtimes.
  return new Promise<Blob>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error(`Failed to read file: ${uri}`));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

export async function uriToBase64(uri: string): Promise<string> {
  return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

export async function deleteUploadedFile(downloadUrl: string): Promise<void> {
  // downloadUrl looks like: https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encodedPath>?alt=...
  try {
    const u = new URL(downloadUrl);
    const match = u.pathname.match(/\/o\/(.+)$/);
    if (!match) return;
    const path = decodeURIComponent(match[1]);
    await deleteObject(ref(storage, path));
  } catch {
    // Best effort — broken URL or already deleted.
  }
}
