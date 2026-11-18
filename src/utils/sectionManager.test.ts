import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultPracticeDataset } from '../data/pianoData';
import {
  generateAnchor,
  getAnchorPool,
  getRegimenList,
  getCategoriesForTier,
  getItemsForCategory,
  isExerciseCompleted,
  handleToggleExerciseProgress,
  resetAnchorProgress,
  GlobalRegimenProgress
} from './sectionManager';

test('getAnchorPool partitions anchors correctly per tier', () => {
  const techAnchors = getAnchorPool('Technique', defaultPracticeDataset);
  assert.ok(techAnchors.length > 0);
  assert.ok(techAnchors.every(i => i.category === 'Key'));

  const repAnchors = getAnchorPool('Repertoire', defaultPracticeDataset);
  assert.ok(repAnchors.length > 0);
  assert.ok(repAnchors.every(i => i.category === 'Repertoire'));

  const improvAnchors = getAnchorPool('Improvisation', defaultPracticeDataset);
  assert.ok(improvAnchors.length > 0);
  assert.ok(improvAnchors.every(i => i.category === 'Chord Progressions'));
});

test('getRegimenList returns all exercises in deterministic CSV order', () => {
  const techRegimen = getRegimenList('Technique', defaultPracticeDataset);
  assert.ok(techRegimen.length > 0);
  assert.ok(techRegimen.every(i => i.category !== 'Key'));

  const rawTechExercises = defaultPracticeDataset.filter(i => i.tier === 'Technique' && i.category !== 'Key');
  assert.equal(techRegimen.length, rawTechExercises.length);
  assert.equal(techRegimen[0].id, rawTechExercises[0].id);
  assert.equal(techRegimen[techRegimen.length - 1].id, rawTechExercises[rawTechExercises.length - 1].id);
});

test('getCategoriesForTier returns unique categories including primary categories in CSV order', () => {
  const techCats = getCategoriesForTier('Technique', defaultPracticeDataset);
  assert.deepEqual(techCats, ['Key', 'Scales', 'Scale Patterns', 'Exercises', 'Arpeggios']);

  const repCats = getCategoriesForTier('Repertoire', defaultPracticeDataset);
  assert.deepEqual(repCats, ['Repertoire', 'Comping Style', 'Melody Variations']);

  const improvCats = getCategoriesForTier('Improvisation', defaultPracticeDataset);
  assert.deepEqual(improvCats, ['Chord Progressions', 'Voicing Categories', 'Reharmonization Techniques', 'Soloing']);
});

test('getItemsForCategory returns items for a category in simple-to-complex order', () => {
  const keys = getItemsForCategory('Technique', 'Key', defaultPracticeDataset);
  assert.equal(keys.length, 12);
  assert.equal(keys[0].name, 'C Major');

  const scales = getItemsForCategory('Technique', 'Scales', defaultPracticeDataset);
  assert.equal(scales.length, 5);
  assert.equal(scales[0].name, 'Major Scale');
  assert.equal(scales[scales.length - 1].name, 'Blues Scale');
});

test('generateAnchor picks an anchor item for the active tier', () => {
  const anchor = generateAnchor('Technique', defaultPracticeDataset);
  assert.ok(anchor !== null);
  assert.equal(anchor?.tier, 'Technique');
  assert.equal(anchor?.category, 'Key');
});

test('handleToggleExerciseProgress stores progress per anchor ID in { [anchorId]: { [exerciseId]: boolean } }', () => {
  let progress: GlobalRegimenProgress = {};

  // Toggle exercise under D Major (key-3)
  progress = handleToggleExerciseProgress(progress, 'key-3', 'scale-1');
  assert.equal(isExerciseCompleted(progress, 'key-3', 'scale-1'), true);
  assert.equal(isExerciseCompleted(progress, 'key-3', 'pattern-1'), false);

  // Toggle another exercise under D Major
  progress = handleToggleExerciseProgress(progress, 'key-3', 'pattern-1');
  assert.equal(isExerciseCompleted(progress, 'key-3', 'scale-1'), true);
  assert.equal(isExerciseCompleted(progress, 'key-3', 'pattern-1'), true);

  // Toggle exercise under G Major (key-2) - does NOT affect D Major!
  progress = handleToggleExerciseProgress(progress, 'key-2', 'scale-2');
  assert.equal(isExerciseCompleted(progress, 'key-2', 'scale-2'), true);
  assert.equal(isExerciseCompleted(progress, 'key-3', 'scale-1'), true);
  assert.equal(isExerciseCompleted(progress, 'key-3', 'pattern-1'), true);
  assert.equal(isExerciseCompleted(progress, 'key-2', 'scale-1'), false);

  // Untoggle exercise under D Major
  progress = handleToggleExerciseProgress(progress, 'key-3', 'scale-1');
  assert.equal(isExerciseCompleted(progress, 'key-3', 'scale-1'), false);
  assert.equal(isExerciseCompleted(progress, 'key-3', 'pattern-1'), true);
});

test('resetAnchorProgress clears progress only for specified anchor', () => {
  let progress: GlobalRegimenProgress = {
    'key-3': { 'scale-1': true, 'pattern-1': true },
    'key-2': { 'scale-2': true }
  };

  progress = resetAnchorProgress(progress, 'key-3');
  assert.equal(isExerciseCompleted(progress, 'key-3', 'scale-1'), false);
  assert.equal(isExerciseCompleted(progress, 'key-3', 'pattern-1'), false);
  assert.equal(isExerciseCompleted(progress, 'key-2', 'scale-2'), true);
});
