import React from 'react';
import { ShieldAlert, Sparkles } from 'lucide-react';

const Clinician = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[80vh] text-center">
      <div className="w-20 h-20 rounded-full bg-primary-mauve/10 flex items-center justify-center text-primary-mauve mb-6 animate-float">
        <ShieldAlert className="w-10 h-10" />
      </div>
      <h2 className="font-sans font-black text-3xl text-text-dark mb-3">Maternal Health Clinician Portal</h2>
      <p className="font-sans font-medium text-text-muted max-w-md leading-relaxed mb-6">
        Authorized Access: View dispatch alerts, critical vitals queue logs, and active patient tea-garden monitoring indices in real-time.
      </p>
      <div className="px-5 py-2.5 rounded-full bg-primary-mauve/8 text-primary-mauve border border-primary-mauve/10 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
        <Sparkles className="w-4 h-4 animate-pulse" />
        Patient Focus Active
      </div>
    </div>
  );
};

export default Clinician;
