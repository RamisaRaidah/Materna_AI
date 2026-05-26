import React, { useEffect, useState } from 'react';
import { AlertTriangle, PhoneCall, ShieldAlert } from 'lucide-react';
import { clinicianAPI, sosAPI } from '../api';

const ClinicianSOS = () => {
  const [dispatches, setDispatches] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const [alertData, contactData] = await Promise.all([
          clinicianAPI.getAlerts(),
          sosAPI.getContacts(),
        ]);
        if (!isActive) {
          return;
        }
        const sosAlerts = Array.isArray(alertData)
          ? alertData.filter((alert) => alert.alert_type === 'sos' || alert.alert_type === 'kick')
          : [];
        setDispatches(sosAlerts);
        setContacts(Array.isArray(contactData) ? contactData : []);
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
    return () => {
      isActive = false;
    };
  }, []);

  const handleDismiss = async (alertId) => {
    try {
      await clinicianAPI.dismissAlert(alertId);
      setDispatches((prev) => prev.filter((alert) => alert.id !== alertId));
    } catch (err) {
      setError('Failed to dismiss alert.');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 font-sans">
      <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-text-dark">Emergency SOS Dispatches</h1>
          <p className="text-xs font-semibold text-text-muted mt-1">
            Active emergency calls, escalation status, and response routing
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
      </div>

      <div className="bg-danger/5 border border-danger/20 rounded-2xl p-5 shadow-premium flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-1" />
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-danger">High Priority Dispatch</h3>
          <p className="text-[11px] font-semibold text-text-muted mt-1">
            Verify location, send transport, and notify the nearest facility.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium">
          <div className="flex items-center gap-2 text-primary-mauve">
            <PhoneCall className="w-5 h-5" />
            <h3 className="text-xs font-black uppercase tracking-wider">Active Dispatch Log</h3>
          </div>
          {error && (
            <div className="mt-4 text-[11px] font-semibold text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="text-xs font-semibold text-text-muted">Loading dispatches...</div>
            ) : dispatches.length === 0 ? (
              <div className="text-xs font-semibold text-text-muted">No active SOS alerts.</div>
            ) : (
              dispatches.map((item) => (
                <div key={item.id} className="p-4 rounded-xl bg-bg-rose-white border border-primary-mauve/10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-text-dark">{item.patient_name || 'Patient'}</p>
                    <p className="text-[11px] font-semibold text-text-muted">{item.title}</p>
                    <p className="text-[11px] font-semibold text-text-muted mt-1">{item.body}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-bold text-text-muted">
                    <span>{item.created_at ? new Date(item.created_at).toLocaleString() : 'Just now'}</span>
                    <button
                      onClick={() => handleDismiss(item.id)}
                      className="px-3 py-1.5 rounded-full bg-white text-[10px] font-black uppercase tracking-wider border border-danger/20 text-danger hover:bg-danger hover:text-white transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium">
          <h3 className="text-xs font-black uppercase tracking-wider text-text-dark">Emergency Contacts</h3>
          <div className="mt-4 space-y-3">
            {contacts.length === 0 ? (
              <div className="text-xs font-semibold text-text-muted">No contacts available.</div>
            ) : (
              contacts.map((contact) => (
                <div key={contact.number} className="p-3 rounded-xl bg-bg-rose-white border border-primary-mauve/10">
                  <p className="text-sm font-bold text-text-dark">{contact.name}</p>
                  <p className="text-[11px] font-semibold text-text-muted">{contact.number}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicianSOS;
