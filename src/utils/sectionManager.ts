import { PracticeItem, MasterTier, getItemType } from '../data/pianoData';

export interface TierSectionState {
  activeAnchor: PracticeItem | null;
  checklist: PracticeItem[];
  completedItemIds: string[];
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

export function getExercisePool(
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

export function generateAnchor(
  tier: MasterTier,
  dataset: PracticeItem[],
  boostedMap: Record<string, boolean> = {},
  hiddenSubcategories: Record<string, boolean> = {}
): PracticeItem | null {
  const anchors = getAnchorPool(tier, dataset, hiddenSubcategories);
  return selectWeightedRandomItem(anchors, boostedMap);
}

export function generateChecklist(
  tier: MasterTier,
  dataset: PracticeItem[],
  boostedMap: Record<string, boolean> = {},
  hiddenSubcategories: Record<string, boolean> = {}
): PracticeItem[] {
  const exercises = getExercisePool(tier, dataset, hiddenSubcategories);
  if (exercises.length === 0) return [];

  // Group by category
  const categoriesMap = new Map<string, PracticeItem[]>();
  exercises.forEach(item => {
    const cat = item.category.trim();
    if (!categoriesMap.has(cat)) {
      categoriesMap.set(cat, []);
    }
    categoriesMap.get(cat)!.push(item);
  });

  const checklist: PracticeItem[] = [];
  categoriesMap.forEach(catItems => {
    const picked = selectWeightedRandomItem(catItems, boostedMap);
    if (picked) {
      checklist.push(picked);
    }
  });

  return checklist;
}

export function toggleCompletedItem(completedItemIds: string[], itemId: string): string[] {
  const exists = completedItemIds.includes(itemId);
  if (exists) {
    return completedItemIds.filter(id => id !== itemId);
  }
  return [...completedItemIds, itemId];
}
