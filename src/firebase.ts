import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc, orderBy, onSnapshot, getDocFromServer } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Import the Firebase configuration from the applet config file
import localFirebaseConfig from '../firebase-applet-config.json';

// Prioritize environment variables (for Vercel/Production) over the local config file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || localFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || localFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || localFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || localFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || localFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || localFirebaseConfig.appId,
};

// Determine the database ID
let databaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || localFirebaseConfig.firestoreDatabaseId || '(default)';

// Safety check: If the database ID looks like a storage bucket (ends in .app or .com), 
// it's likely an environment variable misconfiguration. Fall back to the local config or default.
if (databaseId.includes('.firebasestorage.app') || databaseId.includes('.firebaseapp.com')) {
  console.warn(`WARNING: Detected invalid Database ID: "${databaseId}". This looks like a Storage Bucket or Auth Domain. Falling back to local configuration.`);
  databaseId = localFirebaseConfig.firestoreDatabaseId || '(default)';
}

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app, databaseId);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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

// Test connection
async function testConnection() {
  try {
    console.log(`Testing Firestore connection to database: ${databaseId === '(default)' ? 'default' : 'named'}`);
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test: SUCCESS");
  } catch (error: any) {
    if (error.message?.includes('the client is offline')) {
      console.error("CRITICAL: Firestore connection failed. The client is offline.");
      console.error("This usually means the Project ID or API Key in your configuration is incorrect, or the Firestore database has not been created in the Firebase console.");
      console.error(`Using Project ID: ${firebaseConfig.projectId}`);
      console.error(`Using Database ID: ${databaseId}`);
      
      if (databaseId.includes('.app')) {
        console.error("HINT: Your Database ID looks like a URL (possibly a Storage Bucket). Firestore Database IDs should be '(default)' or a GUID-like string (e.g., 'ai-studio-...'). Please check your environment variables.");
      }
    } else if (error.message?.includes('Missing or insufficient permissions')) {
      // This is actually a successful connection, but the path is protected
      console.log("Firestore connection test: CONNECTED (Path Protected)");
    } else {
      console.error("Firestore connection test failed with unexpected error:", error);
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
