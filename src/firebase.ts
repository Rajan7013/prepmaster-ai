import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc, orderBy, onSnapshot, getDocFromServer } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Import the Firebase configuration from the applet config file
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the named database from the config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

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
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test: SUCCESS");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("CRITICAL: Firestore connection failed. The client is offline. This usually means the Project ID or API Key in your configuration is incorrect, or the Firestore database has not been created in the Firebase console.");
    } else if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
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
