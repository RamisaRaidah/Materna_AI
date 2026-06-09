import React from 'react';
import { Shield, CheckCircle2 } from 'lucide-react';

export const PREDEFINED_SAFE_WORDS = [
    { word: 'telescope', hint: 'দূরবীন' },
    { word: 'mosaic', hint: 'চিত্রকলা' },
    { word: 'lantern', hint: 'আলো' },
    { word: 'compass', hint: 'দিকনির্দেশ' },
    { word: 'anchor', hint: 'স্থিতিশীলতা' },
    { word: 'prism', hint: 'কাঁচের দণ্ড' },
    { word: 'fortress', hint: 'দুর্গ' },
    { word: 'velvet', hint: 'মখমল' },
    { word: 'cobalt', hint: 'নীল রঙ' },
    { word: 'labyrinth', hint: 'ধাঁধা' },
    { word: 'marble', hint: 'পাথর' },
    { word: 'quartz', hint: 'স্ফটিক' },
    { word: 'signal', hint: 'ইশারা' },
    { word: 'ember', hint: 'আগুন' },
    { word: 'zenith', hint: 'চূড়া' },
    // Bangla words
    { word: 'পথ', hint: 'রাস্তা' },
    { word: 'নৌকা', hint: 'জলযান' },
    { word: 'গাম', hint: 'আঠা' },
    { word: 'বেল', hint: 'ফল' },
    { word: 'পাথর', hint: 'শিলা' },
    { word: 'সোনা', hint: 'ধাতু' },
    { word: 'পেন', hint: 'কলম' },
    { word: 'বাস', hint: 'যানবাহন' },
    { word: 'টপ', hint: 'উপরে' },
    { word: 'লক', hint: 'তালা' },
];

const SafeWordPicker = ({ value, onChange, isEditing }) => {
    const active = value ? value.trim().toLowerCase() : '';

    if (!isEditing) {
        return (
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">
                    Personal Security Word
                </label>
                <p className="text-[10px] font-medium text-text-muted leading-relaxed">
                    A secret word you can say in any conversation to silently alert your care team.
                    It will only trigger a new alert once your previous one has been resolved.
                </p>
                {active ? (
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-bg-rose-white border border-primary-mauve/10">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                        <span className="text-xs font-bold text-text-dark">••••••••</span>
                        <span className="text-[10px] text-success font-semibold ml-auto">Active</span>
                    </div>
                ) : (
                    <p className="text-[10px] font-semibold text-text-muted mt-1 italic">Not set — edit profile to choose one.</p>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">
                Personal Security Word
            </label>
            <p className="text-[10px] font-medium text-text-muted leading-relaxed">
                Choose one word below. Say it in any AI conversation to silently alert your care team.
                It will only fire a new alert after your previous alert has been resolved.
            </p>

            <div className="grid grid-cols-3 gap-1.5 mt-2">
                {PREDEFINED_SAFE_WORDS.map(({ word, hint }) => {
                    const selected = active === word;
                    return (
                        <button
                            key={word}
                            type="button"
                            onClick={() => onChange(selected ? '' : word)}
                            className={`flex flex-col items-start px-2.5 py-2 rounded-lg border text-left transition-all cursor-pointer ${selected
                                    ? 'border-primary-mauve bg-primary-mauve/10 ring-1 ring-primary-mauve/30'
                                    : 'border-primary-mauve/10 bg-white hover:border-primary-mauve/30 hover:bg-bg-rose-white/50'
                                }`}
                        >
                            <span className={`text-xs font-black leading-none ${selected ? 'text-primary-mauve' : 'text-text-dark'}`}>
                                {word}
                            </span>
                            <span className="text-[9px] font-semibold text-text-muted mt-0.5 leading-none">{hint}</span>
                        </button>
                    );
                })}
            </div>

            {active && (
                <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-success">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>&quot;{active}&quot; is your security word — remember it.</span>
                </div>
            )}

            <button
                type="button"
                onClick={() => onChange('')}
                className="text-[10px] font-semibold text-text-muted hover:text-danger underline mt-1 cursor-pointer"
            >
                Clear selection
            </button>
        </div>
    );
};

export default SafeWordPicker;
