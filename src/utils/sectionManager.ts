import { PracticeItem, MasterTier, getItemType } from '../data/pianoData';

export type GlobalRegimenProgress = Record<string, Record<string, boolean>>;

export interface TierSectionState {
  activeAnchor: PracticeItem | null;
  regimenProgress: GlobalRegimenProgress; // Map of { [anchorId]: { [exerciseId]: boolean } }
  isAnchorLocked: boolean;
}

export function selectWeightedRandomItem(
  items: PracticeItem[],
  boostedMap: Record<string, boolean> = {}
): PracticeItem | null {
  if (items.length === 0) return null;

  const pool: PracticeItem[] = [];
  for (const item of items) {
    const isBoosted = boostedMap[item.id] || boostedMap[`${item.tier}:${item.category}:${item.name}`];
    const weight = isBoosted ? 5 : 1;
    for (let i = 0; i < weight; i++) {
      pool.push(item);
    }
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  return { ...pool[randomIndex] };
}

export function getAnchorPool(
  tier: MasterTier,
  dataset: PracticeItem[],
  hiddenSubcategories: Record<string, boolean> = {}
): PracticeItem[] {
  return dataset.filter(item => {
    if (item.tier !== tier) return false;
    const isAnchor = getItemType(item) === 'Anchor';
    if (!isAnchor) return false;
    const isHidden = hiddenSubcategories[`${tier}:${item.category.trim()}`];
    return !isHidden;
  });
}

/**
 * Deterministic progressive curriculum:
 * Pulls ALL exercise items belonging to the active tier in exact CSV database order.
 * Excludes anchors and hidden categories.
 */
export function getRegimenList(
  tier: MasterTier,
  dataset: PracticeItem[],
  hiddenSubcategories: Record<string, boolean> = {}
): PracticeItem[] {
  return dataset.filter(item => {
    if (item.tier !== tier) return false;
    const isExercise = getItemType(item) === 'Exercise';
    if (!isExercise) return false;
    const isHidden = hiddenSubcategories[`${tier}:${item.category.trim()}`];
    return !isHidden;
  });
}

/**
 * Returns distinct exercise subcategories for a tier in deterministic CSV order.
 */
export function getExerciseCategoriesForTier(
  tier: MasterTier,
  dataset: PracticeItem[],
  hiddenSubcategories: Record<string, boolean> = {}
): string[] {
  const seen = new Set<string>();
  const categories: string[] = [];
  for (const item of dataset) {
    if (item.tier === tier && getItemType(item) === 'Exercise') {
      const cat = item.category.trim();
      const isHidden = hiddenSubcategories[`${tier}:${cat}`];
      if (!isHidden && !seen.has(cat)) {
        seen.add(cat);
        categories.push(cat);
      }
    }
  }
  return categories;
}

/**
 * Returns all exercises for a specific subcategory ordered simple-to-complex (CSV database order).
 */
export function getExercisesForCategory(
  tier: MasterTier,
  category: string,
  dataset: PracticeItem[]
): PracticeItem[] {
  return dataset.filter(
    item => item.tier === tier &&
            item.category.trim().toLowerCase() === category.trim().toLowerCase() &&
            getItemType(item) === 'Exercise'
  );
}

export function generateAnchor(
  tier: MasterTier,
  dataset: PracticeItem[],
  boostedMap: Record<string, boolean> = {},
  hiddenSubcategories: Record<string, boolean> = {}
): PracticeItem | null {
  const anchors = getAnchorPool(tier, dataset, hiddenSubcategories);
  return selectWeightedRandomItem(anchors, boostedMap);
}

/**
 * Checks if an exercise is completed under an anchor ID.
 * Seamlessly handles both boolean map { [anchorId]: { [exerciseId]: boolean } }
 * and legacy array format { [anchorId]: string[] }.
 */
export function isExerciseCompleted(
  progress: GlobalRegimenProgress | Record<string, any>,
  anchorId: string,
  exerciseId: string
): boolean {
  if (!progress || !progress[anchorId]) return false;
  const val = progress[anchorId];
  if (Array.isArray(val)) {
    return val.includes(exerciseId);
  }
  if (typeof val === 'object' && val !== null) {
    return Boolean(val[exerciseId]);
  }
  return false;
}

/**
 * Toggles completion of an exercise under a specific anchor ID in the global mapping:
 * { [anchorId]: { [exerciseId]: boolean } }
 */
export function handleToggleExerciseProgress(
  progress: GlobalRegimenProgress | Record<string, any> = {},
  anchorId: string,
  exerciseId: string
): GlobalRegimenProgress {
  const currentAnchorData = progress[anchorId] || {};
  let newMap: Record<string, boolean> = {};

  if (Array.isArray(currentAnchorData)) {
    for (const id of currentAnchorData) {
      newMap[id] = true;
    }
  } else if (typeof currentAnchorData === 'object' && currentAnchorData !== null) {
    newMap = { ...currentAnchorData };
  }

  const currentStatus = Boolean(newMap[exerciseId]);
  newMap[exerciseId] = !currentStatus;

  return {
    ...progress,
    [anchorId]: newMap
  };
}

/**
 * Clears completed exercise checkmarks for the active anchor.
 */
export function resetAnchorProgress(
  progress: GlobalRegimenProgress | Record<string, any> = {},
  anchorId: string
): GlobalRegimenProgress {
  return {
    ...progress,
    [anchorId]: {}
  };
}
