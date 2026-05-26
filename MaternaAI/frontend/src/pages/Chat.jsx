import React from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';

const Chat = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[80vh] text-center">
      <div className="w-20 h-20 rounded-full bg-primary-mauve/10 flex items-center justify-center text-primary-mauve mb-6 animate-float">
        <MessageSquare className="w-10 h-10" />
      </div>
      <h2 className="font-sans font-black text-3xl text-text-dark mb-3">AI Voice Companion</h2>
      <p className="font-sans font-medium text-text-muted max-w-md leading-relaxed mb-6">
        Speak or type with our advanced AI assistant in English or Bengali to get instant guidance on pregnancy safety.
      </p>
      <div className="px-5 py-2.5 rounded-full bg-primary-mauve/8 text-primary-mauve border border-primary-mauve/10 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
        <Sparkles className="w-4 h-4 animate-pulse" />
        Coming Soon
      </div>
    </div>
  );
};

export default Chat;
