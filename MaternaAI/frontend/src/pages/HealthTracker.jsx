import React from 'react';
import { Activity, Sparkles } from 'lucide-react';

const HealthTracker = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[80vh] text-center">
      <div className="w-20 h-20 rounded-full bg-info/10 flex items-center justify-center text-info mb-6 animate-float">
        <Activity className="w-10 h-10" />
      </div>
      <h2 className="font-sans font-black text-3xl text-text-dark mb-3">Maternal Vitals Tracker</h2>
      <p className="font-sans font-medium text-text-muted max-w-md leading-relaxed mb-6">
        Log and monitor your daily clinical metrics (blood pressure, glucose, weight, and hydration) with instant AI-powered anomaly checks.
      </p>
      <div className="px-5 py-2.5 rounded-full bg-info/8 text-info border border-info/10 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
        <Sparkles className="w-4 h-4 animate-pulse" />
        Coming Soon
      </div>
    </div>
  );
};

export default HealthTracker;
