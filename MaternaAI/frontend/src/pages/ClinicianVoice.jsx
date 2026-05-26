import React from 'react';
import { Activity, Mic, MessageSquare, Sparkles } from 'lucide-react';

const ClinicianVoice = () => {
  const scripts = [
    'Follow up on severe headache cases within 20 minutes.',
    'Confirm folate adherence for week 24+ patients.',
    'Escalate any bleeding reports to emergency transport.',
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 font-sans">
      <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-text-dark">AI Voice Assistant Console</h1>
            <p className="text-xs font-semibold text-text-muted mt-1">
              Rapid triage voice workflows and scripted outreach
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary-mauve/10 text-primary-mauve flex items-center justify-center">
            <Mic className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gradient-to-br from-bg-dark-mauve to-primary-mauve text-white rounded-2xl p-6 shadow-premium">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              <h3 className="text-xs font-black uppercase tracking-wider">Live Voice Session</h3>
            </div>
            <p className="text-sm font-semibold mt-3 max-w-md">
              Connect to patient calls, trigger emergency scripts, and log outcomes in real time.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="px-4 py-2 rounded-lg bg-white/15 border border-white/20 text-xs font-bold uppercase tracking-wider">
                Start Call
              </button>
              <button className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-wider">
                Record Summary
              </button>
            </div>
          </div>

          <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium">
            <div className="flex items-center gap-2 text-primary-mauve">
              <MessageSquare className="w-5 h-5" />
              <h3 className="text-xs font-black uppercase tracking-wider">Patient Outreach Queue</h3>
            </div>
            <div className="mt-4 space-y-3">
              {['Sumi Das', 'Marium Bibi', 'Ruma Akter'].map((name) => (
                <div key={name} className="flex items-center justify-between p-3 rounded-xl bg-bg-rose-white border border-primary-mauve/10">
                  <div>
                    <p className="text-sm font-bold text-text-dark">{name}</p>
                    <p className="text-[11px] font-semibold text-text-muted">Pending outreach - high risk</p>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg bg-primary-mauve text-white text-[11px] font-bold">
                    Call Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-primary-mauve/10 rounded-2xl p-5 shadow-premium">
            <div className="flex items-center gap-2 text-primary-mauve">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-xs font-black uppercase tracking-wider">Recommended Scripts</h3>
            </div>
            <ul className="mt-4 space-y-3 text-[11px] font-semibold text-text-muted">
              {scripts.map((item) => (
                <li key={item} className="p-3 rounded-xl bg-bg-rose-white border border-primary-mauve/10">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white border border-primary-mauve/10 rounded-2xl p-5 shadow-premium">
            <h3 className="text-xs font-black uppercase tracking-wider text-text-dark">Session Health</h3>
            <p className="mt-2 text-[11px] font-medium text-text-muted">
              3 active calls, 12 queued transcripts, 98% voice accuracy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicianVoice;
