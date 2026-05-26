import React from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';

const SOS = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[80vh] text-center">
      <div className="w-20 h-20 rounded-full bg-danger/10 flex items-center justify-center text-danger mb-6 animate-float">
        <AlertTriangle className="w-10 h-10" />
      </div>
      <h2 className="font-sans font-black text-3xl text-text-dark mb-3">Emergency SOS Logs</h2>
      <p className="font-sans font-medium text-text-muted max-w-md leading-relaxed mb-6">
        View recent safety alarms triggered in your local region, emergency contacts registered, and quick distress signal dispatches.
      </p>
      <div className="px-5 py-2.5 rounded-full bg-danger/8 text-danger border border-danger/10 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
        <Sparkles className="w-4 h-4 animate-pulse" />
        Coming Soon
      </div>
    </div>
  );
};

export default SOS;
