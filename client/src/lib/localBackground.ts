const DATABASE_NAME = "ahs-chat-local-settings";
const STORE_NAME = "settings";
const BACKGROUND_KEY = "website-background";
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
export const MAX_LOCAL_BACKGROUND_BYTES = 10 * 1024 * 1024;

let currentObjectUrl: string | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (!("indexedDB" in window)) {
    return Promise.reject(new Error("Local image storage is not available in this browser"));
  }
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Couldn't open local image storage"));
    request.onblocked = () => reject(new Error("Local image storage is blocked by another tab"));
  });
}

function applyBackground(image: Blob | null) {
  const root = document.documentElement;
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = image ? URL.createObjectURL(image) : null;

  if (currentObjectUrl) {
    root.style.setProperty("--local-background-image", `url("${currentObjectUrl}")`);
  } else {
    root.style.removeProperty("--local-background-image");
  }
  root.classList.toggle("has-local-background", currentObjectUrl !== null);
}

export async function saveLocalBackground(file: File): Promise<void> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Choose a PNG, JPEG, WebP, or GIF image");
  }
  if (file.size > MAX_LOCAL_BACKGROUND_BYTES) {
    throw new Error("Choose an image smaller than 10 MB");
  }

  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(file, BACKGROUND_KEY);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error("Couldn't save the local background"));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || new Error("Couldn't save the local background"));
    };
  });
  applyBackground(file);
}

export async function clearLocalBackground(): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(BACKGROUND_KEY);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error("Couldn't remove the local background"));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || new Error("Couldn't remove the local background"));
    };
  });
  applyBackground(null);
}

export async function hasLocalBackground(): Promise<boolean> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getKey(BACKGROUND_KEY);
    request.onsuccess = () => {
      const exists = request.result !== undefined;
      transaction.oncomplete = () => {
        database.close();
        resolve(exists);
      };
    };
    request.onerror = () => {
      database.close();
      reject(request.error || new Error("Couldn't read the local background"));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || new Error("Couldn't read the local background"));
    };
  });
}

export async function loadLocalBackground(): Promise<void> {
  const database = await openDatabase();
  const image = await new Promise<Blob | undefined>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(BACKGROUND_KEY);
    request.onsuccess = () => {
      const storedImage = request.result instanceof Blob ? request.result : undefined;
      transaction.oncomplete = () => {
        database.close();
        resolve(storedImage);
      };
    };
    request.onerror = () => {
      database.close();
      reject(request.error || new Error("Couldn't read the local background"));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || new Error("Couldn't read the local background"));
    };
  });
  applyBackground(image || null);
}
