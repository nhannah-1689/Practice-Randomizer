import React from 'react';

interface CategoryIconProps {
  category: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category, className = "w-10 h-10" }) => {
  const getIconSvg = () => {
    const cat = category.toLowerCase().trim();

    // Scales, Modes, Clef
    if (cat.includes('scale') || cat.includes('mode')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#0091FF]">
          <path d="M4 8h16M4 12h16M4 16h16" />
          <path d="M10 18v-8a2 2 0 1 1 4 0v6" />
          <circle cx="12" cy="16" r="2" fill="currentColor" />
        </svg>
      );
    }

    // Technique, Drill, Hand/Finger, Exercises, Arpeggios
    if (cat.includes('technique') || cat.includes('drill') || cat.includes('finger') || cat.includes('hand') || cat.includes('exercise') || cat.includes('arpeggio')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#0091FF]">
          <path d="M18 11V6a2 2 0 0 0-4 0v5" />
          <path d="M14 10V4a2 2 0 0 0-4 0v6" />
          <path d="M10 10.5V5a2 2 0 0 0-4 0v9" />
          <path d="M6 14a2 2 0 0 0-2 2v2a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-4a2 2 0 0 0-2-2h-4" />
        </svg>
      );
    }

    // Accompaniment, Groove, Rhythm, Metronome
    if (cat.includes('accompaniment') || cat.includes('groove') || cat.includes('rhythm') || cat.includes('pattern') || cat.includes('bass')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#0091FF]">
          <path d="M12 3l-6 18h12l-6-18z" />
          <path d="M12 9l5 4" />
          <circle cx="12" cy="18" r="1.5" fill="currentColor" />
        </svg>
      );
    }

    // Tunes, Repertoire, Books, Hymnals
    if (cat.includes('tune') || cat.includes('repertoire') || cat.includes('source') || cat.includes('book') || cat.includes('hymn') || cat.includes('psalter')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#0091FF]">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10M6 10h10" />
        </svg>
      );
    }

    // Upper Structures & Hybrid Voicings, Keyboards
    if (cat.includes('upper structure') || cat.includes('hybrid') || cat.includes('keyboard') || cat.includes('structure')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#0091FF]">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M7 4v8M11 4v8M15 4v8M3 12h18" />
          <rect x="9" y="4" width="2" height="5" fill="currentColor" />
          <rect x="13" y="4" width="2" height="5" fill="currentColor" />
        </svg>
      );
    }

    // Voicings & Grips
    if (cat.includes('voicing') || cat.includes('grip') || cat.includes('chord')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#0091FF]">
          <path d="M3 11h18M5 7h2M9 7h2M13 7h2M17 7h2" />
          <path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
        </svg>
      );
    }

    // Reharmonization, Substitution, Swap
    if (cat.includes('reharmonization') || cat.includes('reharm') || cat.includes('swap') || cat.includes('substitution')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#0091FF]">
          <path d="M7 10h14l-4-4M17 14H3l4 4" />
        </svg>
      );
    }

    // Melody, Soloing, Improvisation, Sparkles
    if (cat.includes('melody') || cat.includes('solo') || cat.includes('improv') || cat.includes('variation')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#0091FF]">
          <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
          <path d="M19 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
        </svg>
      );
    }

    // Default musical note
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#0091FF]">
        <circle cx="9" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
        <path d="M12 18V6l9-2v12" />
      </svg>
    );
  };

  return (
    <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-[#0091FF]/10 border border-[#0091FF]/25 shrink-0 ${className}`}>
      {getIconSvg()}
    </div>
  );
};
