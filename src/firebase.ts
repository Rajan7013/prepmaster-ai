import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc, orderBy, onSnapshot, getDocFromServer } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Load Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '(default)';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Initialize Firestore with better handling for the default database
export const db = firestoreDatabaseId === '(default)' 
  ? getFirestore(app) 
  : getFirestore(app, firestoreDatabaseId);

export const auth = getAuth(app);

// Debug: Check if config is present (without logging sensitive values)
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn("Firebase configuration is missing. Please check your environment variables.");
}

// Initialize storage lazily or check if bucket exists
let storageInstance: any = null;
try {
  if (firebaseConfig.storageBucket) {
    storageInstance = getStorage(app);
  }
} catch (error) {
  console.error("Firebase Storage initialization failed:", error);
}

export const storage = storageInstance;
export const googleProvider = new GoogleAuthProvider();

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    console.error("Firestore connection test failed:", error);
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("CRITICAL: The client is offline. This usually means the Project ID or API Key in your configuration is incorrect, or the Firestore database has not been created in the Firebase console.");
    }
  }
}
testConnection();

export { 
  signInWithPopup, 
  onAuthStateChanged, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  orderBy, 
  onSnapshot,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
};
export type { User };
