import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  writeBatch,
  arrayUnion,
  deleteField,
  type DocumentData,
  type QueryConstraint,
  type DocumentReference,
  type DocumentSnapshot,
  type Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  POSTS: 'posts',
  FRIENDSHIPS: 'friendships',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  BLOCKS: 'blocks',
} as const;

/**
 * Get a single document by ID
 */
export async function getDocument<T>(collectionName: string, docId: string): Promise<T | null> {
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as T;
  }
  return null;
}

/**
 * Create or overwrite a document
 */
export async function setDocument(collectionName: string, docId: string, data: DocumentData): Promise<void> {
  const docRef = doc(db, collectionName, docId);
  return setDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update specific fields in a document
 */
export async function updateDocument(
  collectionName: string,
  docId: string,
  data: Partial<DocumentData>
): Promise<void> {
  const docRef = doc(db, collectionName, docId);
  return updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a document
 */
export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  const docRef = doc(db, collectionName, docId);
  return deleteDoc(docRef);
}

/**
 * Query documents with constraints
 */
export async function queryDocuments<T>(collectionName: string, constraints: QueryConstraint[]): Promise<T[]> {
  const collectionRef = collection(db, collectionName);
  const q = query(collectionRef, ...constraints);
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as T[];
}

/**
 * Paginated query result
 */
export interface PaginatedResult<T> {
  data: T[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Query documents with pagination support
 */
export async function queryDocumentsPaginated<T>(
  collectionName: string,
  constraints: QueryConstraint[],
  pageSize: number,
  cursor?: DocumentSnapshot | null
): Promise<PaginatedResult<T>> {
  const collectionRef = collection(db, collectionName);

  // Build constraints with cursor if provided
  const allConstraints = cursor
    ? [...constraints, startAfter(cursor), limit(pageSize)]
    : [...constraints, limit(pageSize)];

  const q = query(collectionRef, ...allConstraints);
  const querySnapshot = await getDocs(q);

  const data = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as T[];

  const lastDoc = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;

  return {
    data,
    lastDoc,
    hasMore: querySnapshot.docs.length === pageSize,
  };
}

/**
 * Subscribe to real-time updates for a document
 */
export function subscribeToDocument<T>(
  collectionName: string,
  docId: string,
  callback: (data: T | null) => void
): Unsubscribe {
  const docRef = doc(db, collectionName, docId);

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as T);
    } else {
      callback(null);
    }
  });
}

/**
 * Subscribe to real-time updates for a query
 */
export function subscribeToQuery<T>(
  collectionName: string,
  constraints: QueryConstraint[],
  callback: (data: T[]) => void
): Unsubscribe {
  const collectionRef = collection(db, collectionName);
  const q = query(collectionRef, ...constraints);

  return onSnapshot(q, (querySnapshot) => {
    const results = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
    callback(results);
  });
}

/**
 * Get document reference for creating new documents
 */
export function getDocRef(collectionName: string, docId?: string): DocumentReference {
  if (docId) {
    return doc(db, collectionName, docId);
  }
  return doc(collection(db, collectionName));
}

/**
 * Add a new document with auto-generated ID
 */
export async function addDocument(collectionName: string, data: DocumentData): Promise<string> {
  const docRef = doc(collection(db, collectionName));
  await setDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Convert Firestore timestamp to Date
 */
export function timestampToDate(timestamp: Timestamp | null | undefined): Date | null {
  if (!timestamp) return null;
  return timestamp.toDate();
}

/**
 * Run a Firestore transaction
 * The updateFunction receives a transaction object and should return the result
 */
export async function runFirestoreTransaction<T>(
  updateFunction: (transaction: Parameters<Parameters<typeof runTransaction>[1]>[0]) => Promise<T>
): Promise<T> {
  return runTransaction(db, updateFunction);
}

/**
 * Create a Firestore batch for multiple writes
 */
export function createBatch() {
  return writeBatch(db);
}

// Re-export commonly used Firestore functions for convenience
export {
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  deleteField,
  type DocumentSnapshot,
};
