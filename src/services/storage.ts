import { openDB, IDBPDatabase } from 'idb';
import { db as firestore, doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc, orderBy, storage, ref, uploadBytes, getDownloadURL, deleteObject } from '../firebase';

const DB_NAME = 'InterviewAppDB';
const VIDEO_STORE = 'videos';
const SESSION_STORE = 'sessions';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(VIDEO_STORE)) {
          db.createObjectStore(VIDEO_STORE);
        }
        if (!db.objectStoreNames.contains(SESSION_STORE)) {
          db.createObjectStore(SESSION_STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveVideo(id: string, blob: Blob, uid: string) {
  const db = await getDB();
  await db.put(VIDEO_STORE, blob, id);
  
  // Upload to Firebase Storage for cross-device access and security
  if (!storage) {
    console.warn("Firebase Storage not initialized. Video saved locally only.");
    return null;
  }

  try {
    const storageRef = ref(storage, `videos/${uid}/${id}.webm`);
    await uploadBytes(storageRef, blob);
    const downloadUrl = await getDownloadURL(storageRef);
    
    // Update session with storage URL
    const sessionDoc = await getDoc(doc(firestore, 'sessions', id));
    if (sessionDoc.exists()) {
      const sessionData = sessionDoc.data();
      await setDoc(doc(firestore, 'sessions', id), {
        ...sessionData,
        videoUrl: downloadUrl,
        storagePath: `videos/${uid}/${id}.webm`
      });
    }
    return downloadUrl;
  } catch (error) {
    console.error("Error uploading video to Firebase Storage:", error);
    return null;
  }
}

export async function getVideo(id: string): Promise<Blob | undefined> {
  const db = await getDB();
  return db.get(VIDEO_STORE, id);
}

export async function saveSession(session: any) {
  const db = await getDB();
  await db.put(SESSION_STORE, session);
  
  // Sync to Firestore
  try {
    await setDoc(doc(firestore, 'sessions', session.id), session);
  } catch (error) {
    console.error("Error syncing session to Firestore:", error);
  }
}

export async function getSessions(uid: string): Promise<any[]> {
  // Try Firestore first for the most up-to-date list
  try {
    const q = query(
      collection(firestore, 'sessions'),
      where('uid', '==', uid),
      orderBy('timestamp', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const sessions = querySnapshot.docs.map(doc => doc.data());
    
    // Update local cache
    const db = await getDB();
    for (const session of sessions) {
      await db.put(SESSION_STORE, session);
    }
    
    return sessions;
  } catch (error) {
    console.error("Error fetching sessions from Firestore, falling back to local:", error);
    const db = await getDB();
    const localSessions = await db.getAll(SESSION_STORE);
    return localSessions.filter(s => s.uid === uid).sort((a, b) => b.date.localeCompare(a.date));
  }
}

export async function getSession(id: string): Promise<any | undefined> {
  // Try local first for speed
  const db = await getDB();
  const local = await db.get(SESSION_STORE, id);
  if (local) return local;

  // Fallback to Firestore
  try {
    const docSnap = await getDoc(doc(firestore, 'sessions', id));
    if (docSnap.exists()) {
      const data = docSnap.data();
      await db.put(SESSION_STORE, data);
      return data;
    }
  } catch (error) {
    console.error("Error fetching session from Firestore:", error);
  }
  return undefined;
}

export async function deleteSession(id: string, uid: string) {
  const db = await getDB();
  await db.delete(SESSION_STORE, id);
  await db.delete(VIDEO_STORE, id);
  
  // Delete from Firestore
  try {
    await deleteDoc(doc(firestore, 'sessions', id));
  } catch (error) {
    console.error("Error deleting session from Firestore:", error);
  }

  // Delete from Firebase Storage
  if (storage) {
    try {
      const storageRef = ref(storage, `videos/${uid}/${id}.webm`);
      await deleteObject(storageRef);
    } catch (error) {
      // Ignore error if file doesn't exist
      console.error("Error deleting video from Storage:", error);
    }
  }
}

export async function saveUserProfile(uid: string, profile: any) {
  const data = {
    ...profile,
    uid,
    updatedAt: new Date().toISOString()
  };
  
  // Save to local storage as backup
  localStorage.setItem(`userProfile_${uid}`, JSON.stringify(data));
  
  // Save to Firestore
  try {
    await setDoc(doc(firestore, 'users', uid), data);
  } catch (error) {
    console.error("Error saving user profile to Firestore:", error);
    throw error; // Throw so UI can handle it
  }
}

export async function getUserProfile(uid: string): Promise<any | null> {
  // Try Firestore
  try {
    const docSnap = await getDoc(doc(firestore, 'users', uid));
    if (docSnap.exists()) {
      const data = docSnap.data();
      localStorage.setItem(`userProfile_${uid}`, JSON.stringify(data));
      return data;
    }
  } catch (error) {
    console.error("Error fetching user profile from Firestore:", error);
  }
  
  // Fallback to local storage
  const local = localStorage.getItem(`userProfile_${uid}`);
  return local ? JSON.parse(local) : null;
}

export async function savePracticeSession(uid: string, session: any) {
  const data = {
    ...session,
    uid,
    timestamp: new Date().toISOString()
  };
  
  // Save to local storage as backup
  const existing = JSON.parse(localStorage.getItem(`practice_sessions_${uid}`) || '[]');
  localStorage.setItem(`practice_sessions_${uid}`, JSON.stringify([data, ...existing]));
  
  // Save to Firestore
  try {
    await setDoc(doc(firestore, 'practice_sessions', data.sessionId), data);
  } catch (error) {
    console.error("Error saving practice session to Firestore:", error);
  }
}
