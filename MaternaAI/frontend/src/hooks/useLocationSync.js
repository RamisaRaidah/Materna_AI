import { useEffect, useRef } from 'react';
import { authAPI } from '../api';

const ACCURACY_THRESHOLD_M  = 500;   // ignore readings worse than this
const DISTANCE_THRESHOLD_M  = 200;   // only save when moved this far
const GEOCODE_THROTTLE_MS   = 5 * 60 * 1000;  // max one Nominatim call per 5 min

// Haversine distance (metres)
function haversineMetres(lat1, lng1, lat2, lng2) {
  const R  = 6_371_000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Reverse geocode via Nominatim (free, no key)
async function reverseGeocode(lat, lng) {
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const a    = data.address || {};
    // Build a short, readable label — e.g. "Mirpur 10, Dhaka, Dhaka Division"
    const parts = [
      a.neighbourhood || a.suburb || a.village || a.hamlet,
      a.city          || a.town   || a.municipality || a.county,
      a.state,
    ].filter(Boolean);
    return parts.join(', ') || data.display_name || `${lat.toFixed(4)},${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)},${lng.toFixed(4)}`;
  }
}

// Hook
export function useLocationSync(user, updateUserLocalContext) {
  const watchIdRef = useRef(null);
  const lastSavedRef = useRef({ lat: null, lng: null });
  const lastGeocodeRef = useRef(0);   // timestamp of last Nominatim call
  const savingRef = useRef(false);

  useEffect(() => {
    // Only run for patients with geolocation support
    if (!user?.id || user.role !== 'patient') return;
    if (!navigator.geolocation) return;

    const handlePosition = async (pos) => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;

      // 1. Skip inaccurate readings (IP fallback etc.)
      if (accuracy > ACCURACY_THRESHOLD_M) return;

      // 2. Skip if we haven't moved enough
      const last = lastSavedRef.current;
      if (last.lat !== null) {
        const dist = haversineMetres(last.lat, last.lng, lat, lng);
        if (dist < DISTANCE_THRESHOLD_M) return;
      }

      // 3. Prevent concurrent saves
      if (savingRef.current) return;
      savingRef.current = true;

      try {
        lastSavedRef.current = { lat, lng };

        // 4. Reverse geocode — throttled
        const now = Date.now();
        let address = user.location || `${lat.toFixed(4)},${lng.toFixed(4)}`;
        if (now - lastGeocodeRef.current > GEOCODE_THROTTLE_MS) {
          lastGeocodeRef.current = now;
          address = await reverseGeocode(lat, lng);
        }

        // 5. Persist to backend via existing PATCH /auth/me
        await authAPI.updateMe({
          location:  address,
          latitude:  lat,
          longitude: lng,
        });

        // 6. Update local AuthContext so the rest of the app sees it immediately
        updateUserLocalContext({
          location:  address,
          latitude:  lat,
          longitude: lng,
        });

        console.log('[LocationSync] Saved:', address, `(${lat.toFixed(5)}, ${lng.toFixed(5)})`);
      } catch (err) {
        console.warn('[LocationSync] Save failed:', err.message);
      } finally {
        savingRef.current = false;
      }
    };

    const handleError = (err) => {
      // Permission denied or unavailable — fail silently, never show UI error
      console.warn('[LocationSync] GPS unavailable:', err.message);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: true,
        timeout:    10_000,
        maximumAge: 30_000,
      }
    );

    // Clean up watcher on logout / unmount
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [user?.id, user?.role]);
}