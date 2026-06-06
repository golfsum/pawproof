import { ref, deleteObject, listAll, type StorageReference } from 'firebase/storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { auth, storage } from './firebase';

/**
 * Upload a local file URI (file://...) to Firebase Storage.
 * Returns the public download URL.
 *
 * IMPORTANT — RN upload path: we upload the file BINARY straight to Firebase
 * Storage's REST endpoint via expo-file-system's uploadAsync, instead of the
 * Firebase JS SDK's uploadBytes/uploadString. On React Native the SDK builds a
 * Blob from the file bytes for the request body, and RN's Blob can't be
 * constructed from an ArrayBuffer/typed array — it throws "creating blobs from
 * 'ArrayBuffer' and 'ArrayBufferView' are not supported" (and older versions
 * silently hung forever — the "endless spinner" bug). uploadAsync streams the
 * file directly, touching neither Blob nor base64, and is reliable + faster.
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

  const bucket = storage.app.options.storageBucket;
  if (!bucket) {
    throw new Error('Storage bucket is not configured.');
  }

  // Firebase ID token authorizes the request against Storage security rules.
  let idToken: string;
  try {
    idToken = await auth.currentUser.getIdToken();
  } catch (e: any) {
    throw new Error(`Could not authenticate the upload: ${e?.message ?? e}`);
  }

  const ext = contentType === 'application/pdf' ? 'pdf' : 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const objectPath = `users/${uid}/${folder}/${fileName}`;
  const encodedPath = encodeURIComponent(objectPath);
  // v0 "media" upload: object name goes in the query, bytes in the body.
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${encodedPath}`;

  let resp: FileSystem.FileSystemUploadResult;
  try {
    resp = await withUploadTimeout(
      FileSystem.uploadAsync(uploadUrl, localUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          // Firebase Storage REST uses the "Firebase" auth scheme, not Bearer.
          Authorization: `Firebase ${idToken}`,
          'Content-Type': contentType,
        },
      }),
      60_000,
    );
  } catch (e: any) {
    console.error('[storage] upload failed (network)', {
      message: e?.message,
      bucket,
      objectPath,
      uid,
    });
    throw new Error(e?.message ?? 'Upload failed.');
  }

  if (resp.status < 200 || resp.status >= 300) {
    let serverMsg = '';
    try {
      serverMsg = JSON.parse(resp.body)?.error?.message ?? '';
    } catch {
      serverMsg = (resp.body ?? '').slice(0, 300);
    }
    console.error('[storage] upload failed', {
      status: resp.status,
      serverMessage: serverMsg,
      bucket,
      objectPath,
      uid,
    });
    throw new Error(humanizeStorageError(String(resp.status), serverMsg));
  }

  // Build the public download URL from the returned downloadTokens.
  try {
    const meta = JSON.parse(resp.body) as { downloadTokens?: string };
    const token = meta.downloadTokens?.split(',')[0];
    const tokenParam = token ? `&token=${token}` : '';
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media${tokenParam}`;
  } catch {
    throw new Error('Upload succeeded but the server response was unreadable.');
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
  // HTTP status codes from the REST upload path.
  if (c === '401' || c === '403') {
    return 'Storage rules denied the upload. Check Firebase Console → Storage → Rules (and that you are signed in).';
  }
  if (c === '404') {
    return `Storage bucket not found. Check the bucket name in Firebase config.${serverResp ? ` (${serverResp})` : ''}`;
  }
  if (c === '413') return 'File is too large to upload.';
  if (c === '429') return 'Too many uploads right now. Wait a moment and try again.';
  // Legacy Firebase SDK error-code strings (kept for safety).
  if (c.includes('unauthorized')) {
    return 'Storage rules denied the upload. Check Firebase Console → Storage → Rules.';
  }
  if (c.includes('quota-exceeded')) return 'Storage quota exceeded for this project.';
  if (c.includes('canceled')) return 'Upload was cancelled.';
  if (c.includes('object-not-found')) return 'Storage object missing after upload.';
  if (c.includes('retry-limit-exceeded')) return 'Upload timed out. Check your network.';
  if (serverResp) {
    // Firebase puts the real error here. E.g.
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

/**
 * Recursively delete every Storage object under users/{uid} — pet photos,
 * scanned documents, etc. Used by account deletion so nothing is left behind.
 * Best-effort per object: a single failed delete won't abort the whole wipe.
 */
export async function deleteAllUserFiles(uid: string): Promise<void> {
  await deleteFolderRecursive(ref(storage, `users/${uid}`));
}

async function deleteFolderRecursive(folderRef: StorageReference): Promise<void> {
  const res = await listAll(folderRef);
  await Promise.all(res.items.map(item => deleteObject(item).catch(() => {})));
  await Promise.all(res.prefixes.map(prefix => deleteFolderRecursive(prefix)));
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
