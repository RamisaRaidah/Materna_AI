import React from 'react';
import { Users, Sparkles } from 'lucide-react';

const Community = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[80vh] text-center">
      <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center text-success mb-6 animate-float">
        <Users className="w-10 h-10" />
      </div>
      <h2 className="font-sans font-black text-3xl text-text-dark mb-3">Peer Support Groups</h2>
      <p className="font-sans font-medium text-text-muted max-w-md leading-relaxed mb-6">
        Connect with other mothers in your geographic region or tea garden hub to discuss post-birth recovery, share tips, and build community.
      </p>
      <div className="px-5 py-2.5 rounded-full bg-success/8 text-success border border-success/10 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
        <Sparkles className="w-4 h-4 animate-pulse" />
        Coming Soon
      </div>
    </div>
  );
};

export default Community;
