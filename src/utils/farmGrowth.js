// Shared with the SVG: visual stages never change planting/harvesting rules.
export function farmGrowth(tick = 0, tickGoal = 21, state = 'GROWING') {
  const goal = Math.max(1, Number(tickGoal) || 1);
  const progress = state === 'READY' ? 1 : Math.max(0, Math.min(1, (Number(tick) || 0) / goal));
  const stage = progress < .15 ? { key: 'seed', label: 'Germination' }
    : progress < .35 ? { key: 'seedling', label: 'Seedling' }
    : progress < .6 ? { key: 'foliage', label: 'Vegetative Growth' }
    : progress < .8 ? { key: 'flower', label: 'Flowering' }
    : { key: 'fruit', label: 'Fruit & Ripening' };
  return { progress, stage };
}
