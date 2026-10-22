export type MasterTier = 'Technique' | 'Repertoire' | 'Improvisation';

export interface PracticeItem {
  id: string;
  tier: MasterTier;
  category: string;
  name: string;
  description: string;
  pageNumber?: string;
}

export const defaultPracticeDataset: PracticeItem[] = [
  // ==========================================
  // TIER 1: TECHNIQUE
  // ==========================================
  // Primary Source Category: Scales
  {
    id: "scale-1",
    tier: "Technique",
    category: "Scales",
    name: "Major Scale",
    description: "The foundational 7-note diatonic scale providing the baseline for major harmony."
  },
  {
    id: "scale-2",
    tier: "Technique",
    category: "Scales",
    name: "Major Pentatonic Scale",
    description: "A 5-note scale (1-2-3-5-6) great for melodic, consonant phrasing without avoided half-steps."
  },
  {
    id: "scale-3",
    tier: "Technique",
    category: "Scales",
    name: "Minor Pentatonic Scale",
    description: "A 5-note scale (1-b3-4-5-b7) essential for blues, rock, and contemporary jazz/neo-soul lines."
  },
  {
    id: "scale-4",
    tier: "Technique",
    category: "Scales",
    name: "Modes",
    description: "Diatonic rotations (Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian) used to color chord qualities."
  },
  {
    id: "scale-5",
    tier: "Technique",
    category: "Scales",
    name: "Blues Scale",
    description: "A minor pentatonic scale augmented with a flat-5 chromatic passing tone (\"blue note\")."
  },

  // Secondary Paired Modifier Category: Scale Patterns
  {
    id: "pattern-1",
    tier: "Technique",
    category: "Scale Patterns",
    name: "Broken 3rds",
    description: "Practicing scales by skipping every other note in thirds (1-3-2-4-3-5) to build dexterity and interval awareness."
  },
  {
    id: "pattern-2",
    tier: "Technique",
    category: "Scale Patterns",
    name: "Triads (1-3-5-3)",
    description: "Ascending a scale in structural triad shapes, cycling root, third, fifth, and back to third."
  },
  {
    id: "pattern-3",
    tier: "Technique",
    category: "Scale Patterns",
    name: "Triads 3-over-4",
    description: "Polyrhythmic grouping where triads are patterned with a 3-against-4 metric feel."
  },
  {
    id: "pattern-4",
    tier: "Technique",
    category: "Scale Patterns",
    name: "Linear",
    description: "Playing a scale or line straight up and down sequentially without skips or rhythmic variation."
  },
  {
    id: "pattern-5",
    tier: "Technique",
    category: "Scale Patterns",
    name: "Chords",
    description: "Practicing root-position or inverted chords continuously through a scale or key cycle."
  },
  {
    id: "pattern-6",
    tier: "Technique",
    category: "Scale Patterns",
    name: "Approach & Pivot Variations",
    description: "Shifting directions using approach notes and pivot tones between patterns."
  },

  // Secondary Paired Modifier Category: Exercises
  {
    id: "ex-1",
    tier: "Technique",
    category: "Exercises",
    name: "Scale-Over-Voicing",
    description: "Left hand holds/sustains a chord while right hand plays matching scale up/down to build independence."
  },
  {
    id: "ex-2",
    tier: "Technique",
    category: "Exercises",
    name: "Rhythmic Sandwich",
    description: "Beat 1: Play RH chord staccato. Beats 2–3: Fast RH scale run. Beat 4: Snap RH back to next shape."
  },
  {
    id: "ex-3",
    tier: "Technique",
    category: "Exercises",
    name: "Arpeggio Displacement",
    description: "Left hand holds a block voicing while right hand arpeggiates identical notes upward to hear inner cluster tones."
  },
  {
    id: "ex-4",
    tier: "Technique",
    category: "Exercises",
    name: "Pivots",
    description: "Anchoring a specific finger while moving other fingers around it to change hand position or harmony."
  },
  {
    id: "ex-5",
    tier: "Technique",
    category: "Exercises",
    name: "The Continuous Line",
    description: "Playing an unbroken stream of eighth notes through a progression while left hand switches accompaniment."
  },

  // Standalone Category: Arpeggios
  {
    id: "arp-1",
    tier: "Technique",
    category: "Arpeggios",
    name: "Major Arpeggios",
    description: "Fluid continuous broken chord execution across multiple octaves in major keys."
  },
  {
    id: "arp-2",
    tier: "Technique",
    category: "Arpeggios",
    name: "Minor Arpeggios",
    description: "Fluid continuous broken chord execution across multiple octaves in minor keys."
  },
  {
    id: "arp-3",
    tier: "Technique",
    category: "Arpeggios",
    name: "Dominant 7th Arpeggios",
    description: "Navigating 4-note dominant arpeggio structures with smooth thumb tucks."
  },
  {
    id: "arp-4",
    tier: "Technique",
    category: "Arpeggios",
    name: "Diminished 7th Arpeggios",
    description: "Symmetrical minor third intervals spanning the keyboard symmetrically."
  },

  // ==========================================
  // TIER 2: REPERTOIRE
  // ==========================================
  // Primary Source Category: Repertoire Sources
  {
    id: "rep-1",
    tier: "Repertoire",
    category: "Repertoire Sources",
    name: "1991 Baptist Hymnal",
    description: "Traditional hymnal used primarily for practicing strict 4-part voice leading and traditional hymnody.",
    pageNumber: "Page 142"
  },
  {
    id: "rep-2",
    tier: "Repertoire",
    category: "Repertoire Sources",
    name: "1912 Psalter",
    description: "Historic metrical psalter used primarily for practicing strict 4-part voice leading and vocal harmony.",
    pageNumber: "Page 85"
  },
  {
    id: "rep-3",
    tier: "Repertoire",
    category: "Repertoire Sources",
    name: "Barberville Baptist Hymn Booklet",
    description: "Used for working through chords, progressions, lead sheets, and varying accompaniment styles.",
    pageNumber: "Page 12"
  },
  {
    id: "rep-4",
    tier: "Repertoire",
    category: "Repertoire Sources",
    name: "Sing! Hymnal",
    description: "Used for working through chords, progressions, lead sheets, and varying accompaniment styles.",
    pageNumber: "Page 210"
  },
  {
    id: "rep-5",
    tier: "Repertoire",
    category: "Repertoire Sources",
    name: "Our Singing Country",
    description: "Used for working through chords, progressions, lead sheets, and varying accompaniment styles (American folk/spirituals).",
    pageNumber: "Page 64"
  },
  {
    id: "rep-6",
    tier: "Repertoire",
    category: "Repertoire Sources",
    name: "The Real Book Vol. 1",
    description: "Used for working through jazz standards, chord progressions, lead sheets, and varying accompaniment styles.",
    pageNumber: "Page 188"
  },
  {
    id: "rep-7",
    tier: "Repertoire",
    category: "Repertoire Sources",
    name: "GigSheet App",
    description: "Digital app housing standard hymns, Christmas tunes, chords, progressions, and varying accompaniment styles."
  },

  // Standalone Category: Page #
  {
    id: "page-1",
    tier: "Repertoire",
    category: "Page #",
    name: "Page 142 (Hymnal)",
    description: "Specific hymn page reference for strict voice leading practice."
  },
  {
    id: "page-2",
    tier: "Repertoire",
    category: "Page #",
    name: "Page 85 (Psalter)",
    description: "Historic psalter page reference for vocal harmony."
  },
  {
    id: "page-3",
    tier: "Repertoire",
    category: "Page #",
    name: "Page 188 (Real Book)",
    description: "Jazz standard lead sheet page reference."
  },
  {
    id: "page-4",
    tier: "Repertoire",
    category: "Page #",
    name: "Page 210 (Sing! Hymnal)",
    description: "Hymnal arrangement page reference."
  },

  // Secondary Paired Modifier Category: Comping Style (Accompaniment & Groove Patterns)
  {
    id: "comp-1",
    tier: "Repertoire",
    category: "Comping Style",
    name: "Straight Bass (4/4)",
    description: "Alternating low root notes on beats 1 and 3 with mid-register chord comping on beats 2 and 4."
  },
  {
    id: "comp-2",
    tier: "Repertoire",
    category: "Comping Style",
    name: "Omitted Bass (4/4)",
    description: "Leaving out the root note in the bass register to open up sonic space or focus on mid-register voicings."
  },
  {
    id: "comp-3",
    tier: "Repertoire",
    category: "Comping Style",
    name: "Inverted Bass (4/4)",
    description: "Playing bass notes using chord inversions (3rd or 5th in bass) for smoother stepwise basslines."
  },
  {
    id: "comp-4",
    tier: "Repertoire",
    category: "Comping Style",
    name: "Viennese Bass (4/4)",
    description: "A waltz-inspired rhythmic layout featuring a low root followed by mid-register chord pulses."
  },
  {
    id: "comp-5",
    tier: "Repertoire",
    category: "Comping Style",
    name: "Broken 10th Bass (4/4)",
    description: "Spreading the root and 3rd/10th across a wide interval in the left hand."
  },
  {
    id: "comp-6",
    tier: "Repertoire",
    category: "Comping Style",
    name: "Boogie Bass (4/4)",
    description: "Driving eighth-note walking or bouncing bassline pattern (root-3-5-6-flat7)."
  },
  {
    id: "comp-7",
    tier: "Repertoire",
    category: "Comping Style",
    name: "Rhumba",
    description: "Afro-Cuban syncopated pattern with accented hits on specific off-beats."
  },
  {
    id: "comp-8",
    tier: "Repertoire",
    category: "Comping Style",
    name: "Tango",
    description: "Latin syncopated dance rhythm with characteristic dotted-eighth/sixteenth pulses."
  },
  {
    id: "comp-9",
    tier: "Repertoire",
    category: "Comping Style",
    name: "8va to 7th bass (3/4)",
    description: "3/4 time accompaniment shifting between 8va octave root bass and 7th chord bass voicings."
  },

  // Standalone Category: Melody Variations
  {
    id: "mel-1",
    tier: "Repertoire",
    category: "Melody Variations",
    name: "Grace Notes & Ornaments",
    description: "Quick ornamental note(s) struck immediately before primary melody note."
  },
  {
    id: "mel-2",
    tier: "Repertoire",
    category: "Melody Variations",
    name: "Dyads & Intervals",
    description: "Playing two-note harmonic intervals under melody to thicken texture."
  },
  {
    id: "mel-3",
    tier: "Repertoire",
    category: "Melody Variations",
    name: "Ghost Notes & Articulation",
    description: "Articulating notes very softly to add rhythmic bounce and dynamic nuance."
  },
  {
    id: "mel-4",
    tier: "Repertoire",
    category: "Melody Variations",
    name: "Chromatic Passing Tones",
    description: "Inserting non-diatonic half-step notes between scale tones in the melodic line."
  },

  // ==========================================
  // TIER 3: IMPROVISATION
  // ==========================================
  // Primary Source Category: Chord Progressions
  {
    id: "prog-1",
    tier: "Improvisation",
    category: "Chord Progressions",
    name: "ii - V - I - VI Circle Progression",
    description: "The quintessential jazz progression cycling through key centers for improvisational exploration."
  },
  {
    id: "prog-2",
    tier: "Improvisation",
    category: "Chord Progressions",
    name: "12-Bar Blues in F / Bb",
    description: "Standard blues harmonic framework utilizing dominant 7th chords and quick changes."
  },
  {
    id: "prog-3",
    tier: "Improvisation",
    category: "Chord Progressions",
    name: "Minor Fall / Andalusian Cadence",
    description: "Descending minor tetrachord progression (i - bVII - bVI - V7) rich with dramatic tension."
  },
  {
    id: "prog-4",
    tier: "Improvisation",
    category: "Chord Progressions",
    name: "Backdoor Progression (iv - bVII7 - I)",
    description: "Smooth modal interchange progression resolving into the major tonic chord."
  },
  {
    id: "prog-5",
    tier: "Improvisation",
    category: "Chord Progressions",
    name: "Coltrane Changes Cycle",
    description: "Symmetrical major third root movement dividing the octave into three equal tonal centers."
  },

  // Secondary Paired Modifier Category: Voicing Categories (includes Upper Structures)
  {
    id: "voice-1",
    tier: "Improvisation",
    category: "Voicing Categories",
    name: "Shell Voicings (Root + 3rd + 7th)",
    description: "Playing essential guide tones to outline harmony cleanly without clutter."
  },
  {
    id: "voice-2",
    tier: "Improvisation",
    category: "Voicing Categories",
    name: "Rootless Left-Hand Voicings",
    description: "A-form and B-form rootless chords designed for comping behind a bass player."
  },
  {
    id: "voice-3",
    tier: "Improvisation",
    category: "Voicing Categories",
    name: "So What Chords",
    description: "Iconic modal voicing consisting of three perfect 4ths stacked with a major 3rd on top."
  },
  {
    id: "voice-4",
    tier: "Improvisation",
    category: "Voicing Categories",
    name: "C13(b9) = A / C7 (Upper Structure)",
    description: "An A major triad played over a C7 shell to voice an altered dominant color."
  },
  {
    id: "voice-5",
    tier: "Improvisation",
    category: "Voicing Categories",
    name: "C7(#9) = Eb / C7 (Upper Structure)",
    description: "An Eb major triad played over a C7 shell to create the classic Jimi/jazz altered sound."
  },
  {
    id: "voice-6",
    tier: "Improvisation",
    category: "Voicing Categories",
    name: "Cmaj13(#11) = D / Cmaj7 (Upper Structure)",
    description: "A D major triad over a Cmaj7 shell for a lush Lydian major sound."
  },

  // Standalone Category: Reharmonization Techniques
  {
    id: "rehar-1",
    tier: "Improvisation",
    category: "Reharmonization Techniques",
    name: "Dominant Tritone Substitution",
    description: "Substituting a dominant 7th chord with another dominant located a tritone away."
  },
  {
    id: "rehar-2",
    tier: "Improvisation",
    category: "Reharmonization Techniques",
    name: "Secondary Dominants",
    description: "Inserting dominant 7th of any non-tonic target chord to create resolution tension."
  },
  {
    id: "rehar-3",
    tier: "Improvisation",
    category: "Reharmonization Techniques",
    name: "Modal Interchange / Harmonic Mixture",
    description: "Borrowing chords from parallel minor into major key (or vice versa)."
  },
  {
    id: "rehar-4",
    tier: "Improvisation",
    category: "Improvisation",
    name: "Diminished Leading-Tone Chords",
    description: "Using diminished passing chords to smoothly approach target harmonies."
  },

  // Standalone Category: Soloing
  {
    id: "solo-1",
    tier: "Improvisation",
    category: "Soloing",
    name: "Target 3rd & 7th Guide Tones",
    description: "Aiming improvisation lines directly at chord guide tones during chord changes."
  },
  {
    id: "solo-2",
    tier: "Improvisation",
    category: "Soloing",
    name: "Rhythmic Displacement",
    description: "Shifting melodic phrases rhythmically like a drummer to create syncopation."
  },
  {
    id: "solo-3",
    tier: "Improvisation",
    category: "Soloing",
    name: "Motivic Development",
    description: "Modifying a short rhythmic shape to fit successive chord changes."
  }
];
