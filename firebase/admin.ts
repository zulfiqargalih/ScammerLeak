// firebase/admin.ts
import admin from "firebase-admin";

const hasConfig =
  typeof process.env.FIREBASE_SERVICE_ACCOUNT_JSON === "string" &&
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim().length > 0;

let initialized = false;

if (hasConfig && !admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON as string);

    // storageBucket is passed so admin.storage().bucket() works as default.
    // upload.ts explicitly resolves the correct bucket name at call time.
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket,
    });
    initialized = true;
  } catch (err) {
    console.error("[Firebase Admin] Failed to initialize:", err);
  }
} else if (hasConfig && admin.apps.length) {
  initialized = true;
} else {
  console.warn(
    "[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_JSON is not configured. " +
    "All Firestore/Auth/Storage calls will return empty stubs."
  );
}

// -------------------------------------------------------
// Stub Firestore — prevents "collection is not a function"
// when env vars are missing (e.g. local dev without .env.local)
// -------------------------------------------------------
const firestoreStub = {
  collection: (_path: string) => ({
    add: async (_data: any) => ({ id: "stub-id" }),
    doc: (_id: string) => ({
      get: async () => ({ exists: false, data: () => null, id: "stub-id" }),
      set: async (_data: any) => {},
      update: async (_data: any) => {},
      delete: async () => {},
    }),
    where: (..._args: any[]) => ({
      orderBy: (..._args2: any[]) => ({
        get: async () => ({ docs: [], empty: true }),
        limit: (_n: number) => ({ get: async () => ({ docs: [], empty: true }) }),
      }),
      get: async () => ({ docs: [], empty: true }),
    }),
    orderBy: (..._args: any[]) => ({
      get: async () => ({ docs: [], empty: true }),
      limit: (_n: number) => ({ get: async () => ({ docs: [], empty: true }) }),
    }),
    get: async () => ({ docs: [], empty: true }),
  }),
  doc: (_path: string) => ({
    get: async () => ({ exists: false, data: () => null, id: "stub-id" }),
    set: async (_data: any) => {},
    update: async (_data: any) => {},
    delete: async () => {},
  }),
};

// Stub Auth
const authStub = {
  verifyIdToken: async (_token: string) => {
    throw new Error("[Firebase Admin Stub] Auth not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON.");
  },
  getUser: async (_uid: string) => null,
};

// Stub Storage
const storageStub = {
  bucket: (_name?: string) => ({
    file: (_path: string) => ({
      getSignedUrl: async (_opts: any) => [""],
      save: async (_data: any) => {},
      delete: async () => {},
    }),
  }),
};

export const adminAuth = initialized ? admin.auth() : (authStub as any);
export const adminFirestore = initialized ? admin.firestore() : (firestoreStub as any);
export const adminStorage = initialized ? admin.storage() : (storageStub as any);

