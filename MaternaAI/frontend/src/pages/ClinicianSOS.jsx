import React, { useRef, useEffect, useState } from 'react';
import { AlertTriangle, PhoneCall, ShieldAlert, Eye, MapPin, X } from 'lucide-react';
import { clinicianAPI, sosAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot, orderBy, query as fsQuery, limit as fsLimit, deleteDoc, doc as fsDoc } from 'firebase/firestore';
import { db } from '../api/firebase';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

function MapController({ position }) {
  const map = useMap();
  useEffect(() => {
    // Small delay ensures modal container is fully rendered/visible
    const timer = setTimeout(() => {
      map.invalidateSize();
      map.setView(position, 15);
    }, 200);
    return () => clearTimeout(timer);
  }, [map, position]);
  return null;
}

function FlyToMarker({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 15, { animate: true, duration: 1.2 });
    }
  }, [position, map]);
  return null;
}

const ClinicianSOS = () => {
  const { user } = useAuth();
  const [dispatches, setDispatches] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assigningId, setAssigningId] = useState(null);
  const [activeMap, setActiveMap] = useState(null);
  const resolvedFirestoreIds = useRef(new Set());
  const sqlAlertsRef = useRef([]);

  useEffect(() => {
    let isActive = true;
    const loadData = async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const [alertData, contactData] = await Promise.all([
          clinicianAPI.getSosAlerts(),
          sosAPI.getContacts(),
        ]);
        if (!isActive) {
          return;
        }
        const sqlAlerts = Array.isArray(alertData) ? alertData : [];
        sqlAlertsRef.current = sqlAlerts;
        setContacts(Array.isArray(contactData) ? contactData : []);
        setDispatches((prev) => {
          const firestoreAlerts = prev.filter((a) => a.from_firestore);
          return [...firestoreAlerts, ...sqlAlerts];
        });
        setError('');
      } catch (err) {
        if (!isActive) {
          return;
        }
        setError('Unable to load SOS dispatches.');
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadData();
    const pollId = setInterval(() => loadData(true), 10000);
    return () => {
      isActive = false;
      clearInterval(pollId);
    };
  }, []);

  useEffect(() => {
    if (!db) return;
    const q = fsQuery(
      collection(db, 'abuse_alerts'),
      orderBy('createdAt', 'desc'),
      fsLimit(20)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreAlerts = [];
      snapshot.forEach((docSnap) => {
        if (resolvedFirestoreIds.current.has(docSnap.id)) return;
        const data = docSnap.data();
        firestoreAlerts.push({
          id: docSnap.id,           // e.g. "alert_123"
          sql_id: data.alert_id,    // the real integer SQL id
          alert_type: 'abuse_alert',
          patient_name: data.patient_name || 'Unknown Patient',
          title: data.title || '🔴 SILENT ABUSE ALERT',
          body: data.body || '',
          location: data.location || 'Unknown',
          trigger: data.trigger || 'unknown',
          confidence: data.confidence || 1,
          created_at: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          assigned_to: null,
          from_firestore: true,
        });
      });

      setDispatches([...firestoreAlerts, ...sqlAlertsRef.current]);
    }, (err) => {
      console.error('Firestore abuse_alerts subscription error:', err);
    });
    return () => unsubscribe();
  }, []);


  const handleDismiss = async (alertId, isFirestore = false) => {
    try {
      if (isFirestore) {
        resolvedFirestoreIds.current.add(alertId);
        await deleteDoc(fsDoc(db, 'abuse_alerts', alertId));

        const numericId = alertId.replace('alert_', '');
        if (numericId && !isNaN(numericId)) {
          await clinicianAPI.dismissAlert(parseInt(numericId)).catch((e) => {
            console.warn('[Dismiss] SQL dismiss failed for', numericId, e);
          });
        }
      } else {
        await clinicianAPI.dismissAlert(alertId);
      }

      setDispatches((prev) => prev.filter((a) => a.id !== alertId));
      sqlAlertsRef.current = sqlAlertsRef.current.filter((a) => a.id !== alertId);
    } catch (err) {
      setError('Failed to dismiss alert.');
    }
  };


  const handleAssign = async (item) => {
    try {
      setAssigningId(item.id);
      const numericId = item.from_firestore 
      ? parseInt(item.id.replace('alert_', '')) 
      : item.id;
      await clinicianAPI.assignAlert(numericId);

      if (item.from_firestore && db) {
        const { doc: fsDocRef, updateDoc } = await import('firebase/firestore');
        await updateDoc(fsDocRef(db, 'abuse_alerts', item.id), {
          assigned_to: user?.id,
        }).catch(() => {});
      }

      setDispatches((prev) => prev.map((alert) => (
        alert.id === item.id
          ? { ...alert, assigned_to: user?.id, status: 'assigned' }
          : alert
      )));
    } catch (err) {
      setError('Unable to assign SOS alert. It may already be handled.');
    } finally {
      setAssigningId(null);
    }
  };

  const isAbuse = (item) => item.alert_type === 'abuse_alert';

  const triggerLabel = (trigger) => ({
    long_press: '🖐 Avatar hold',
    ai_detection: '🤖 AI detected',
    keyword: '🔤 Keyword match',
    safe_word: '🔑 Safe word',
  }[trigger] || trigger);

  const confidenceBadge = (confidence) => {
    const pct = Math.round((confidence || 1) * 100);
    const color = pct >= 90 ? 'text-danger bg-danger/10 border-danger/20'
      : pct >= 70 ? 'text-warning bg-warning/10 border-warning/20'
        : 'text-info bg-info/10 border-info/20';
    return (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${color}`}>
        {pct}% confidence
      </span>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 font-sans">
      {/* MAP MODAL (Hidden by default) */}
      {activeMap && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-4 w-full max-w-2xl h-[500px] shadow-2xl relative flex flex-col">
            {/* ... close button ... */}
            <div className="flex-1 w-full h-full rounded-xl overflow-hidden border border-primary-mauve/20">
              {activeMap.coords && (
                <MapContainer
                  key={activeMap.coords}
                  center={activeMap.coords.split(',').map(Number)}
                  zoom={15}
                  // Add these styles to ensure the container behaves
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  <MapController position={activeMap.coords.split(',').map(Number)} />
                  <Marker
                    position={activeMap.coords.split(',').map(Number)}
                  >
                    <Popup autoOpen={true}>
                      <div className="font-bold text-xs">
                        {activeMap.name}<br />
                        <span className="font-normal text-[#725b68]">{activeMap.coords}</span>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-text-dark">SOS & Abuse Alert Queue</h1>
          <p className="text-xs font-semibold text-text-muted mt-1">
            Active emergency and silent abuse alerts requiring immediate response
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
      </div>

      {/* Alert type legend */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-danger/10 border border-danger/20">
          <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider text-danger">SOS — Manual emergency</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple/10 border border-purple/20">
          <Eye className="w-3 h-3 text-purple" />
          <span className="text-[10px] font-black uppercase tracking-wider text-purple">Abuse alert — Silent trigger</span>
        </div>
      </div>

      <div className="bg-danger/5 border border-danger/20 rounded-2xl p-5 shadow-premium flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-1" />
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-danger">High Priority Queue</h3>
          <p className="text-[11px] font-semibold text-text-muted mt-1">
            For SOS: verify location, send transport, notify nearest facility.
            For Abuse alerts: do NOT call the patient directly — contact through a trusted third party or visit in person.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Alert list */}
        <div className="lg:col-span-2 bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium">
          <div className="flex items-center gap-2 text-primary-mauve">
            <PhoneCall className="w-5 h-5" />
            <h3 className="text-xs font-black uppercase tracking-wider">Active Alert Log</h3>
          </div>

          {error && (
            <div className="mt-4 text-[11px] font-semibold text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="text-xs font-semibold text-text-muted">Loading alerts...</div>
            ) : dispatches.length === 0 ? (
              <div className="text-xs font-semibold text-text-muted">No active alerts.</div>
            ) : (
              dispatches.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 ${isAbuse(item)
                    ? 'bg-purple/5 border-purple/20'
                    : 'bg-bg-rose-white border-primary-mauve/10'
                    }`}
                >
                  <div className="flex-1 space-y-1.5">

                    {/* Type badge + patient name */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {isAbuse(item) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple/10 border border-purple/20 text-[9px] font-black uppercase tracking-wider text-purple">
                          <Eye className="w-2.5 h-2.5" /> Silent Abuse Alert
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-danger/10 border border-danger/20 text-[9px] font-black uppercase tracking-wider text-danger">
                          🚨 SOS
                        </span>
                      )}
                      <p className="text-sm font-bold text-text-dark">
                        {item.patient_name || 'Patient'}
                      </p>
                    </div>

                    <p className="text-[11px] font-semibold text-text-muted">{item.title}</p>
                    <p className="text-[11px] font-semibold text-text-muted">{item.body}</p>

                    {/* Abuse-specific metadata */}
                    {isAbuse(item) && (
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <span className="text-[10px] font-bold text-text-muted bg-white border border-primary-mauve/10 px-2 py-0.5 rounded-full">
                          {triggerLabel(item.trigger)}
                        </span>
                        {confidenceBadge(item.confidence)}
                      </div>
                    )}

                    {/* Location with Professional Modal trigger */}
                    {item.location && item.location !== 'Unknown' && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <MapPin className="w-3 h-3 text-text-muted" />
                        <span className="text-[10px] font-semibold text-text-muted">
                          {item.location}
                        </span>
                        {/* Show embedded map only for raw GPS — address strings can't be pinned */}
                        {item.location.match(/^-?\d+\.\d+,-?\d+\.\d+$/) ? (
                          <button
                            onClick={() => setActiveMap({ coords: item.location, name: item.patient_name })}
                            className="ml-1 text-primary-mauve underline font-bold text-[10px] hover:text-danger"
                          >
                            View Map
                          </button>
                        ) : (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 text-primary-mauve underline font-bold text-[10px] hover:text-danger"
                          >
                            Open Map
                          </a>
                        )}
                      </div>
                    )}

                    {item.assigned_to === user?.id && (
                      <span className="inline-flex mt-1 px-2.5 py-1 rounded-full bg-success/10 text-success text-[10px] font-bold uppercase tracking-wider">
                        Assigned to you
                      </span>
                    )}
                  </div>

                  {/* Actions + timestamp */}
                  < div className="flex flex-col items-end gap-2 shrink-0" >
                    <span className="text-[10px] font-semibold text-text-muted">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString()
                        : 'Just now'}
                    </span>
                    <div className="flex items-center gap-2">
                      {item.assigned_to === user?.id ? (
                        <button
                          onClick={() => handleDismiss(item.id, item.from_firestore)}
                          className="px-3 py-1.5 rounded-full bg-white text-[10px] font-black uppercase tracking-wider border border-danger/20 text-danger hover:bg-danger hover:text-white transition-colors"
                        >
                          Resolve
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAssign(item)}
                          disabled={assigningId === item.id}
                          className="px-3 py-1.5 rounded-full bg-primary-mauve text-white text-[10px] font-black uppercase tracking-wider hover:bg-bg-dark-mauve transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {assigningId === item.id ? 'Assigning...' : 'Handle'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Emergency contacts */}
        <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium">
          <h3 className="text-xs font-black uppercase tracking-wider text-text-dark">Emergency Contacts</h3>

          {/* Abuse alert guidance */}
          <div className="mt-3 p-3 rounded-xl bg-purple/5 border border-purple/15 text-[10px] font-semibold text-purple leading-relaxed">
            ⚠️ For abuse alerts: never call the patient directly. Route through family contact or visit in person.
          </div>

          <div className="mt-4 space-y-3">
            {contacts.length === 0 ? (
              <div className="text-xs font-semibold text-text-muted">No contacts available.</div>
            ) : (
              contacts.map((contact) => (
                <div
                  key={contact.number}
                  className="p-3 rounded-xl bg-bg-rose-white border border-primary-mauve/10"
                >
                  <p className="text-sm font-bold text-text-dark">{contact.name}</p>
                  <p className="text-[11px] font-semibold text-text-muted">{contact.number}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div >
    </div >
  );
};

export default ClinicianSOS;
