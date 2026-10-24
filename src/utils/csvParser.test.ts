import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, inferTierFromCategory } from './csvParser';

test('inferTierFromCategory infers technique correctly', () => {
  assert.equal(inferTierFromCategory('Major Scales', 'Technique'), 'Technique');
  assert.equal(inferTierFromCategory('Chords', 'Improvisation'), 'Improvisation');
  assert.equal(inferTierFromCategory('Hymn Study', 'Repertoire'), 'Repertoire');
});

test('parseCSV parses comma-separated data correctly', () => {
  const csv = `Technique,Major Scales,C Major,Play all octaves
Repertoire,Hymns,Amazing Grace,Play in 3/4`;
  const items = parseCSV(csv);
  assert.equal(items.length, 2);
  assert.equal(items[0].tier, 'Technique');
  assert.equal(items[0].category, 'Major Scales');
  assert.equal(items[0].name, 'C Major');
  assert.equal(items[1].tier, 'Repertoire');
  assert.equal(items[1].name, 'Amazing Grace');
});
