import React from 'react';
import { ChevronDown } from 'lucide-react';

const NewMessagesIndicator = ({ count, onClick }) => {
  if (!count) return null;

  const label = count === 1 ? 'New Message' : `New Messages (${count})`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary-mauve text-white text-[10px] font-black uppercase tracking-wider shadow-lg hover:bg-bg-dark-mauve transition-all cursor-pointer animate-fadeIn"
    >
      <ChevronDown className="w-3.5 h-3.5" />
      {label}
    </button>
  );
};

export default NewMessagesIndicator;
