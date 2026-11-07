import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultPracticeDataset } from '../data/pianoData';
import {
  generateAnchor,
  generateChecklist,
  getAnchorPool,
  getExercisePool,
  toggleCompletedItem
} from './sectionManager';

test('getAnchorPool partitions anchors correctly per tier', () => {
  const techAnchors = getAnchorPool('Technique', defaultPracticeDataset);
  assert.ok(techAnchors.length > 0);
  assert.ok(techAnchors.every(i => i.category === 'Key'));

  const repAnchors = getAnchorPool('Repertoire', defaultPracticeDataset);
  assert.ok(repAnchors.length > 0);
  assert.ok(repAnchors.every(i => i.category === 'Page #'));

  const improvAnchors = getAnchorPool('Improvisation', defaultPracticeDataset);
  assert.ok(improvAnchors.length > 0);
  assert.ok(improvAnchors.every(i => i.category === 'Chord Progressions'));
});

test('generateChecklist generates 1 item per exercise category', () => {
  const techChecklist = generateChecklist('Technique', defaultPracticeDataset);
  assert.ok(techChecklist.length >= 3 && techChecklist.length <= 5);

  const categories = techChecklist.map(i => i.category);
  const uniqueCategories = new Set(categories);
  assert.equal(categories.length, uniqueCategories.size); // All unique categories
  assert.ok(!categories.includes('Key')); // No anchor category in checklist
});

test('generateAnchor picks an anchor item for the active tier', () => {
  const anchor = generateAnchor('Technique', defaultPracticeDataset);
  assert.ok(anchor !== null);
  assert.equal(anchor?.tier, 'Technique');
  assert.equal(anchor?.category, 'Key');
});

test('toggleCompletedItem toggles id in list', () => {
  let ids: string[] = [];
  ids = toggleCompletedItem(ids, 'item-1');
  assert.deepEqual(ids, ['item-1']);

  ids = toggleCompletedItem(ids, 'item-2');
  assert.deepEqual(ids, ['item-1', 'item-2']);

  ids = toggleCompletedItem(ids, 'item-1');
  assert.deepEqual(ids, ['item-2']);
});
