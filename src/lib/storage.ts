import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { auth, storage } from './firebase';

/**
 * Upload a local file URI (file://...) to Firebase Storage.
 * Returns the public download URL.
 *
 * IMPORTANT — RN upload path: we read the file as base64 and use
 * uploadString(..., 'base64') rather than uploadBytes(blob). On React
 * Native / Hermes, the Blob produced from an XHR request is missing the
 * internals uploadBytes relies on, so uploadBytes can hang FOREVER with
 * no error (the "endless spinner, document never saves" bug). Base64 +
 * uploadString avoids Blob entirely and is reliable across RN runtimes.
 * A hard timeout guarantees we surface a failure instead of hanging.
 */
export async function uploadFile(
  uid: string,
  localUri: string,
  folder: string,
  contentType = 'image/jpeg',
): Promise<string> {
  if (!auth.currentUser) {
    throw new Error('You must be signed in to upload files.');
  }
  if (auth.currentUser.uid !== uid) {
    throw new Error('Auth user mismatch, refusing to upload.');
  }

  let base64: string;
  try {
    base64 = await uriToBase64(localUri);
  } catch (e: any) {
    throw new Error(`Could not read the local file: ${e?.message ?? e}`);
  }
  if (!base64) {
    throw new Error('The selected file appears to be empty.');
  }

  const ext = contentType === 'application/pdf' ? 'pdf' : 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const objectPath = `users/${uid}/${folder}/${fileName}`;
  const r = ref(storage, objectPath);

  try {
    await withUploadTimeout(
      uploadString(r, base64, 'base64', { contentType }),
      60_000,
    );
    return await withUploadTimeout(getDownloadURL(r), 20_000);
  } catch (e: any) {
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

// Reject (instead of hanging) if Storage doesn't respond in time. The RN
// Storage transport occasionally stalls with no error; this turns that into
// a visible, retryable failure.
function withUploadTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let to: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    to = setTimeout(
      () => reject(new Error('Upload timed out. Check your connection and try again.')),
      ms,
    );
  });
  return Promise.race([p, timeout]).finally(() => {
    if (to) clearTimeout(to);
  }) as Promise<T>;
}

function humanizeStorageError(code?: string, serverResp?: string, fallback?: string): string {
  const c = code ?? '';
  if (c.includes('unauthorized')) {
    return 'Storage rules denied the upload. Check Firebase Console → Storage → Rules.';
  }
  if (c.includes('quota-exceeded')) return 'Storage quota exceeded for this project.';
  if (c.includes('canceled')) return 'Upload was cancelled.';
  if (c.includes('object-not-found')) return 'Storage object missing after upload.';
  if (c.includes('retry-limit-exceeded')) return 'Upload timed out. Check your network.';
  if (serverResp) {
    // Firebase puts the real error here for storage/unknown. E.g.
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
    // Best effort, broken URL or already deleted.
  }
}
