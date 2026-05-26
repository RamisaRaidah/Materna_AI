import React from 'react';
import { Apple, Sparkles } from 'lucide-react';

const Nutrition = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[80vh] text-center">
      <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center text-warning mb-6 animate-float">
        <Apple className="w-10 h-10" />
      </div>
      <h2 className="font-sans font-black text-3xl text-text-dark mb-3">Maternal Nutrition & Diet Plan</h2>
      <p className="font-sans font-medium text-text-muted max-w-md leading-relaxed mb-6">
        Receive curated recipes, locally sourced food recommendations (iron, calcium, and folate rich ingredients), and custom meal trackers.
      </p>
      <div className="px-5 py-2.5 rounded-full bg-warning/8 text-warning border border-warning/10 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
        <Sparkles className="w-4 h-4 animate-pulse" />
        Coming Soon
      </div>
    </div>
  );
};

export default Nutrition;
