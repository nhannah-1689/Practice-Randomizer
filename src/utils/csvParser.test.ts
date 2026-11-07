import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, inferTierFromCategory } from './csvParser';

test('inferTierFromCategory infers technique correctly', () => {
  assert.equal(inferTierFromCategory('Major Scales', 'Technique'), 'Technique');
  assert.equal(inferTierFromCategory('Chords', 'Improvisation'), 'Improvisation');
  assert.equal(inferTierFromCategory('Hymn Study', 'Repertoire'), 'Repertoire');
});

test('parseCSV parses 6-column schema with Type correctly', () => {
  const csv = `Tier,Category,Type,Lesson Item,Description,Example
Technique,Key,Anchor,G Major,Foundational sharp key,1 Sharp (F#)
Technique,Scales,Exercise,Major Scale,7-note diatonic,1-2-3-4-5-6-7
Repertoire,Page #,Anchor,Page 142,Hymn page reference,
Improvisation,Chord Progressions,Anchor,ii - V - I,Jazz cadence,Dm7 - G7 - Cmaj7
Improvisation,Soloing,Exercise,Motivic Development,Short phrases,`;
  const items = parseCSV(csv);
  assert.equal(items.length, 5);
  assert.equal(items[0].type, 'Anchor');
  assert.equal(items[0].category, 'Key');
  assert.equal(items[0].name, 'G Major');
  assert.equal(items[0].example, '1 Sharp (F#)');

  assert.equal(items[1].type, 'Exercise');
  assert.equal(items[1].name, 'Major Scale');

  assert.equal(items[2].type, 'Anchor');
  assert.equal(items[2].category, 'Page #');

  assert.equal(items[3].type, 'Anchor');
  assert.equal(items[3].name, 'ii - V - I');

  assert.equal(items[4].type, 'Exercise');
  assert.equal(items[4].name, 'Motivic Development');
});

