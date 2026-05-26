import React from 'react';
import { Smile, Sparkles } from 'lucide-react';

const PPD = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[80vh] text-center">
      <div className="w-20 h-20 rounded-full bg-purple/10 flex items-center justify-center text-purple mb-6 animate-float">
        <Smile className="w-10 h-10" />
      </div>
      <h2 className="font-sans font-black text-3xl text-text-dark mb-3">PPD Assessment (EPDS Screening)</h2>
      <p className="font-sans font-medium text-text-muted max-w-md leading-relaxed mb-6">
        Take a completely private, clinically approved 10-question Edinburgh Postnatal Depression Scale survey to assess post-birth mental wellness.
      </p>
      <div className="px-5 py-2.5 rounded-full bg-purple/8 text-purple border border-purple/10 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
        <Sparkles className="w-4 h-4 animate-pulse" />
        Coming Soon
      </div>
    </div>
  );
};

export default PPD;
