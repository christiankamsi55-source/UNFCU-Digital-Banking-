import { getStorage, ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { app, auth } from './firebase';

export const storage = getStorage(app);

const STORAGE_PROBE_TIMEOUT_MS = 1500;
const MAX_RECEIPT_DATA_URL_CHARS = 420_000;
const MAX_PDF_DATA_URL_CHARS = 850_000;

// Session cache: if Storage bucket is unprovisioned/unreachable, skip repeated 10m SDK retries
let knownStorageUnavailable = false;

export interface UploadResult {
  url: string;
  storageType: 'firebase_storage' | 'firestore_cloud_document';
  path: string;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  if (parts.length < 2) {
    return new Blob([dataUrl], { type: 'text/plain' });
  }
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function uploadResumableWithTimeout(
  storageRef: ReturnType<typeof ref>,
  blob: Blob,
  timeoutMs: number
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, blob);
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        task.cancel();
      } catch {}
      reject(new Error('Firebase Storage upload timed out'));
    }, timeoutMs);

    task.on(
      'state_changed',
      undefined,
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      },
      async () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (urlErr) {
          reject(urlErr);
        }
      }
    );
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        resolve(event.target.result);
      } else {
        reject(new Error(`Unable to read "${file.name}".`));
      }
    };
    reader.onerror = () => reject(new Error(`Failed to read "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image decoding failed'));
    img.src = src;
  });
}

/**
 * Compresses image screenshots so they upload quickly and always fit comfortably
 * within Cloud Firestore & API payload limits while preserving legibility.
 */
export async function compressReceiptFile(
  file: File,
  maxDataUrlChars: number = MAX_RECEIPT_DATA_URL_CHARS
): Promise<string> {
  if (file.type === 'application/pdf') {
    const pdfUrl = await readFileAsDataUrl(file);
    if (pdfUrl.length > MAX_PDF_DATA_URL_CHARS) {
      throw new Error(
        `PDF "${file.name}" is too large. Please upload a smaller PDF (under 600KB) or a screenshot image (PNG/JPEG).`
      );
    }
    return pdfUrl;
  }

  if (!file.type.startsWith('image/')) {
    throw new Error(`File "${file.name}" is not a supported image or PDF format.`);
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(objectUrl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      const raw = await readFileAsDataUrl(file);
      if (raw.length > MAX_PDF_DATA_URL_CHARS) {
        throw new Error(`Image "${file.name}" is too large to process.`);
      }
      return raw;
    }

    const renderScaled = (maxDim: number, quality: number): string => {
      let width = img.naturalWidth || img.width || 1200;
      let height = img.naturalHeight || img.height || 1200;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', quality);
    };

    const attempts: Array<[number, number]> = [
      [1400, 0.82],
      [1400, 0.68],
      [1100, 0.55],
      [900, 0.42],
    ];

    let compressed = '';
    for (const [dim, q] of attempts) {
      compressed = renderScaled(dim, q);
      if (compressed.length <= maxDataUrlChars) {
        return compressed;
      }
    }

    if (compressed && compressed.length <= MAX_PDF_DATA_URL_CHARS) {
      return compressed;
    }
    throw new Error(`Image "${file.name}" exceeds maximum receipt size even after compression.`);
  } catch (err: any) {
    if (file.size <= 550 * 1024) {
      return readFileAsDataUrl(file);
    }
    throw err instanceof Error ? err : new Error(`Failed to process "${file.name}".`);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Checks whether the Firebase Storage bucket is actively provisioned on GCP
 */
export async function verifyFirebaseStorageBucket(): Promise<{
  available: boolean;
  bucket: string;
  error?: string;
  instructions?: string;
}> {
  const bucketName = storage.app.options.storageBucket || 'gen-lang-client-0892908283.firebasestorage.app';
  try {
    const testRef = ref(storage, `_system_probe/${Date.now()}.txt`);
    const blob = new Blob(['ping'], { type: 'text/plain' });
    await uploadResumableWithTimeout(testRef, blob, STORAGE_PROBE_TIMEOUT_MS);
    knownStorageUnavailable = false;
    return {
      available: true,
      bucket: bucketName,
    };
  } catch (err: any) {
    knownStorageUnavailable = true;
    const msg = err?.message || 'Bucket not reachable';
    const is404 =
      msg.includes('Not Found') ||
      msg.includes('timed out') ||
      err?.code === 'storage/unknown' ||
      err?.code === 'storage/bucket-not-found';
    return {
      available: false,
      bucket: bucketName,
      error: msg,
      instructions: is404
        ? 'Firebase Storage has not yet been provisioned in the Firebase Console. The application automatically uses durable Cloud Firestore receipt document storage.'
        : msg,
    };
  }
}

/**
 * Uploads a receipt image to Firebase Storage if available, or immediately passes
 * the compressed data URL for durable Cloud Firestore persistence via /api/payments/submit.
 */
export async function uploadReceiptFile(
  dataUrl: string,
  userId: string,
  submissionId: string,
  index: number
): Promise<UploadResult> {
  const effectiveUid = auth.currentUser?.uid || userId;
  const fileName = `receipt_${submissionId}_${index}_${Date.now()}.jpg`;
  const storagePath = `receipts/${effectiveUid}/${fileName}`;

  if (!knownStorageUnavailable) {
    try {
      const storageRef = ref(storage, storagePath);
      const blob = dataUrl.startsWith('data:')
        ? dataUrlToBlob(dataUrl)
        : new Blob([dataUrl], { type: 'text/plain' });
      const downloadUrl = await uploadResumableWithTimeout(
        storageRef,
        blob,
        STORAGE_PROBE_TIMEOUT_MS
      );
      return {
        url: downloadUrl,
        storageType: 'firebase_storage',
        path: storagePath,
      };
    } catch (storageError: any) {
      knownStorageUnavailable = true;
      console.warn(
        `Firebase Storage bucket unavailable (${storageError?.message || 'timeout'}). Using durable Cloud Firestore receipt storage.`
      );
    }
  }

  return {
    url: dataUrl,
    storageType: 'firestore_cloud_document',
    path: `payment_submissions/${submissionId}/receipts/${index}`,
  };
}
