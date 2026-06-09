import { useCallback, useEffect, useRef } from 'react';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../api/firebase';
import { sosAPI } from '../api';

// IndexedDB helpers
const IDB_NAME = 'materna_abuse_alerts';
const IDB_VERSION = 1;
const STORE = 'pending';

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const idb = e.target.result;
      if (!idb.objectStoreNames.contains(STORE)) {
        idb.createObjectStore(STORE, { keyPath: 'queued_id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function idbAdd(record) {
  const idb = await openIDB();
  const tx  = idb.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).add({ ...record, queued_at: Date.now() });
  return new Promise((res) => { tx.oncomplete = res; });
}

async function idbGetAll() {
  const idb = await openIDB();
  const tx = idb.transaction(STORE, 'readonly');
  return new Promise((res, rej) => {
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror = () => rej(req.error);
  });
}

async function idbDelete(queued_id) {
  const idb = await openIDB();
  const tx  = idb.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(queued_id);
  return new Promise((res) => { tx.oncomplete = res; });
}

// GPS helper
function getLiveCoords(storedLocation = 'Unknown') {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(storedLocation);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        resolve(`${lat.toFixed(5)},${lng.toFixed(5)}`);
      },
      () => resolve(storedLocation),
      { timeout: 4000, maximumAge: 30000, enableHighAccuracy: true }
    );
  });
}

// Firestore writer
async function writeToFirestore(firebase_payload) {
  if (!db || !firebase_payload) return;
  try {
    const alertId  = firebase_payload.alert_id || Date.now();
    const alertRef = doc(collection(db, 'abuse_alerts'), `alert_${alertId}`);
    await setDoc(alertRef, {
      ...firebase_payload,
      createdAt: serverTimestamp(),
    });
    console.log('[AbuseAlert] Firestore written — alert_id:', alertId);
  } catch (err) {
    console.warn('[AbuseAlert] Firestore write failed (non-fatal):', err);
  }
}

// Core send
async function sendAlert(payload) {
  const data = await sosAPI.triggerAbuseAlert(payload);
  if (data?.firebase_payload) {
    await writeToFirestore(data.firebase_payload);
  }
  return data;
}

// Hook
export function useAbuseAlert(userId) {
    const flushingRef = useRef(false);
    const lastSentRef = useRef(0);
    const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
 
    const flushQueue = useCallback(async () => {
        if (flushingRef.current) return;
        flushingRef.current = true;
        try {
            const pending = await idbGetAll();
            for (const item of pending) {
                try {
                    await sendAlert(item);
                    await idbDelete(item.queued_id);
                    console.log('[AbuseAlert] Flushed queued alert:', item.queued_id);
                } catch (err) {
                    console.warn('[AbuseAlert] Flush failed for queued_id:', item.queued_id, err.message);
                }
            }
        } finally {
            flushingRef.current = false;
        }
    }, []);

  useEffect(() => {
    if (navigator.onLine) flushQueue();
    window.addEventListener('online', flushQueue);
    return () => window.removeEventListener('online', flushQueue);
  }, [flushQueue]);

  /**
   * dispatchAbuseAlert
   * @param {'long_press'|'ai_detection'|'keyword'|'safe_word'} trigger
   * @param {string} reason
   * @param {number} confidence  0–1
   * @param {string} storedLocation  user.location as GPS fallback
   */
  const dispatchAbuseAlert = useCallback(async (
    trigger        = 'manual',
    reason         = 'Abuse alert triggered',
    confidence     = 1.0,
    storedLocation = 'Unknown',
  ) => {
    const location = await getLiveCoords(storedLocation);

    const payload = {
      user_id:    userId,
      trigger,
      method:     trigger,
      reason,
      confidence,
      location,
    };

    if (!navigator.onLine) {
      await idbAdd(payload);
      console.log('[AbuseAlert] OFFLINE — queued:', trigger);
      return { queued: true, sent: false };
    }

    try {
      const result = await sendAlert(payload);
      console.log('[AbuseAlert] Sent:', trigger);
      return { queued: false, sent: true, ...result };
    } catch (err) {
      console.warn('[AbuseAlert] Send failed, queuing:', err.message);
      await idbAdd(payload);
      return { queued: true, sent: false };
    }
  }, [userId]);

  return { dispatchAbuseAlert };
}