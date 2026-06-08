import React, { useEffect, useState } from 'react';
import { adminAPI } from '../api';
import { 
  ShieldAlert, UserCheck, UserX, FileText, AlertCircle, 
  Sparkles, Phone, Calendar, MapPin, ExternalLink, Eye, RefreshCw, X 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [actioningId, setActioningId] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null); // For document viewer modal
  const { user } = useAuth();

  const fetchPending = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminAPI.getPendingDoctors();
      setPendingDoctors(data || []);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || 'Failed to fetch pending applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleVerify = async (doctorId, action) => {
    const confirmMsg = action === 'approve' 
      ? 'Are you sure you want to APPROVE this clinician? They will receive full dashboard access.'
      : '⚠️ WARNING: Rejection will BAN this clinician. They will not be able to log in or register again with these credentials. Proceed?';
      
    if (!window.confirm(confirmMsg)) return;

    setActioningId(doctorId);
    setError('');
    setSuccessMsg('');
    try {
      const res = await adminAPI.verifyDoctor(doctorId, action);
      setSuccessMsg(res.message || `Clinician has been successfully ${action === 'approve' ? 'approved' : 'rejected'}.`);
      setPendingDoctors(prev => prev.filter(doc => doc.id !== doctorId));
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || 'Failed to process verification action.');
    } finally {
      setActioningId(null);
    }
  };

  // Helper to parse verification documents JSON
  const parseDocuments = (docStr) => {
    if (!docStr) return { licenseNumber: 'Not provided', files: [] };
    try {
      return JSON.parse(docStr);
    } catch (e) {
      return { licenseNumber: 'Not provided', files: [] };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown Date';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-primary-mauve/10 shadow-premium flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary-mauve mb-1">
            <ShieldAlert className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">Administrative Panel</span>
          </div>
          <h1 className="text-2xl font-black text-text-dark">Clinician Verification System</h1>
          <p className="text-xs font-semibold text-text-muted mt-1">
            Logged in as <span className="text-primary-mauve font-black">{user?.name}</span> (Admin) · Review clinician applications carefully.
          </p>
        </div>
        <button
          onClick={fetchPending}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary-mauve/10 text-xs font-black text-primary-mauve hover:bg-primary-mauve/5 transition-all cursor-pointer shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>RELOAD QUEUE</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-primary-mauve/10 shadow-premium flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-mauve/10 text-primary-mauve flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Pending Approvals</p>
            <p className="text-2xl font-black text-text-dark">{pendingDoctors.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-primary-mauve/10 shadow-premium flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">System Access</p>
            <p className="text-sm font-black text-success">VERIFICATION ACTIVE</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-primary-mauve/10 shadow-premium flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-secondary-blush/20 text-primary-mauve flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Admin Actions</p>
            <p className="text-sm font-black text-text-dark">APPROVE / BAN & REJECT</p>
          </div>
        </div>
      </div>

      {/* Status Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-bold flex items-center gap-3 animate-pulse">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-success text-xs font-bold flex items-center gap-3">
          <UserCheck className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Pending Doctors Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-black text-text-muted uppercase tracking-wider pl-1">Review Queue</h2>

        {loading ? (
          <div className="bg-white border border-primary-mauve/10 rounded-2xl p-12 text-center shadow-premium">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-primary-mauve animate-spin" />
              <p className="text-sm font-semibold text-text-muted">Loading pending clinician registrations...</p>
            </div>
          </div>
        ) : pendingDoctors.length === 0 ? (
          <div className="bg-white border border-primary-mauve/10 rounded-2xl p-12 text-center shadow-premium">
            <div className="max-w-md mx-auto flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-success/10 text-success flex items-center justify-center text-3xl shadow-glow">
                ✓
              </div>
              <h3 className="text-lg font-black text-text-dark">All Reviews Complete</h3>
              <p className="text-xs font-semibold text-text-muted leading-relaxed">
                There are no pending doctor registration applications in the database. Approved clinicians have access to the Command Center.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {pendingDoctors.map(doctor => {
              const docs = parseDocuments(doctor.verification_documents);
              return (
                <div 
                  key={doctor.id} 
                  className="bg-white rounded-2xl border border-primary-mauve/15 p-6 shadow-premium transition-all hover:border-primary-mauve flex flex-col lg:flex-row gap-6 justify-between"
                >
                  {/* Left Column: Clinician Details */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-secondary-blush/20 flex items-center justify-center text-2xl shrink-0">
                        🩺
                      </div>
                      <div>
                        <h3 className="text-base font-black text-text-dark">{doctor.name}</h3>
                        <p className="text-[10px] font-bold text-primary-mauve mt-0.5 uppercase tracking-wider">
                          Clinician (Awaiting Verification)
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-text-muted">
                      <div className="flex items-center gap-2 font-semibold">
                        <Phone className="w-4 h-4 text-primary-mauve shrink-0" />
                        <span>Phone: <strong className="text-text-dark">{doctor.phone}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 font-semibold">
                        <Calendar className="w-4 h-4 text-primary-mauve shrink-0" />
                        <span>Age: <strong className="text-text-dark">{doctor.age} years</strong></span>
                      </div>
                      <div className="flex items-center gap-2 font-semibold">
                        <MapPin className="w-4 h-4 text-primary-mauve shrink-0" />
                        <span className="truncate">Location: <strong className="text-text-dark">{doctor.area}, {doctor.district}, {doctor.division}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 font-semibold">
                        <Calendar className="w-4 h-4 text-primary-mauve shrink-0" />
                        <span>Registered: <strong className="text-text-dark">{formatDate(doctor.created_at)}</strong></span>
                      </div>
                    </div>

                    <div className="p-3.5 bg-bg-rose-white border border-primary-mauve/10 rounded-xl text-xs">
                      <span className="block font-black text-[10px] text-text-muted uppercase tracking-wider mb-1">Emergency / Official Contact</span>
                      <span className="font-bold text-text-dark">{doctor.emergency_contact || 'None provided'}</span>
                    </div>
                  </div>

                  {/* Middle Column: Verification Credentials */}
                  <div className="flex-1 border-t lg:border-t-0 lg:border-l lg:border-r border-primary-mauve/10 pt-4 lg:pt-0 lg:px-6 space-y-4">
                    <div>
                      <span className="block text-[10px] font-black text-text-muted uppercase tracking-wider">License ID / Credentials</span>
                      <p className="text-base font-black text-primary-mauve mt-1 select-all">{docs.licenseNumber}</p>
                    </div>

                    <div>
                      <span className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">Uploaded Documents ({docs.files?.length || 0})</span>
                      {(!docs.files || docs.files.length === 0) ? (
                        <p className="text-xs font-semibold text-danger animate-pulse">No documents uploaded! Reject recommended.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2.5">
                          {docs.files.map((file, idx) => {
                            const isImage = file.type?.startsWith('image/');
                            return (
                              <div 
                                key={idx} 
                                className="group relative border border-primary-mauve/15 rounded-xl p-2 bg-bg-rose-white hover:border-primary-mauve transition-all flex items-center gap-2.5 cursor-pointer max-w-[200px]"
                                onClick={() => setSelectedDoc(file)}
                              >
                                {isImage ? (
                                  <div className="w-9 h-9 rounded-lg overflow-hidden border border-primary-mauve/10 shrink-0 bg-white">
                                    <img src={file.data} alt={file.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                  </div>
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-primary-mauve/10 text-primary-mauve flex items-center justify-center shrink-0 font-bold text-sm">
                                    PDF
                                  </div>
                                )}
                                <div className="min-w-0 pr-1 flex-1">
                                  <p className="text-[10px] font-bold text-text-dark truncate leading-tight">{file.name}</p>
                                  <p className="text-[8px] text-text-muted mt-0.5 uppercase tracking-wider">View File</p>
                                </div>
                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-primary-mauve/80 text-white rounded-full p-0.5">
                                  <Eye className="w-2.5 h-2.5" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="w-full lg:w-52 shrink-0 flex lg:flex-col justify-end lg:justify-center gap-3 border-t lg:border-t-0 pt-4 lg:pt-0">
                    <button
                      onClick={() => handleVerify(doctor.id, 'approve')}
                      disabled={actioningId === doctor.id}
                      className="flex-1 py-3 bg-success hover:bg-success/80 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-glow hover:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>APPROVE</span>
                    </button>
                    <button
                      onClick={() => handleVerify(doctor.id, 'reject')}
                      disabled={actioningId === doctor.id}
                      className="flex-1 py-3 bg-danger hover:bg-danger/80 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <UserX className="w-4 h-4" />
                      <span>REJECT & BAN</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox / Document Viewer Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col border border-primary-mauve/20 shadow-premium animate-fadeIn relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-primary-mauve/10 bg-bg-rose-white">
              <div>
                <h4 className="font-black text-sm text-text-dark">{selectedDoc.name}</h4>
                <p className="text-[10px] text-text-muted mt-0.5 uppercase tracking-wider">Document Review</p>
              </div>
              <button 
                onClick={() => setSelectedDoc(null)}
                className="p-1 text-text-muted hover:text-text-dark rounded-full hover:bg-primary-mauve/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6 flex justify-center items-center bg-zinc-50 min-h-[350px]">
              {selectedDoc.type?.startsWith('image/') ? (
                <img 
                  src={selectedDoc.data} 
                  alt={selectedDoc.name} 
                  className="max-w-full max-h-[60vh] object-contain rounded-lg border border-primary-mauve/10 shadow-md"
                />
              ) : (
                <div className="text-center p-8 bg-white border border-primary-mauve/15 rounded-2xl shadow-premium max-w-md">
                  <div className="text-5xl mb-4">📄</div>
                  <h5 className="font-black text-text-dark text-base mb-2">PDF Document</h5>
                  <p className="text-xs text-text-muted leading-relaxed mb-5">
                    This file is stored in PDF format. You can download or open it in your browser window using the action link below.
                  </p>
                  <a 
                    href={selectedDoc.data} 
                    download={selectedDoc.name}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-mauve hover:bg-bg-dark-mauve text-white text-xs font-black uppercase rounded-lg shadow-glow hover:shadow-none transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Download PDF</span>
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-primary-mauve/10 bg-bg-rose-white text-right">
              <button 
                onClick={() => setSelectedDoc(null)}
                className="px-5 py-2.5 bg-primary-mauve hover:bg-bg-dark-mauve text-white text-xs font-black uppercase tracking-wider rounded-lg cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
