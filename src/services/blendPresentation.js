export function nftRange(row) {
  if (Number(row.template_id) <= 0) return { min: 0, max: 0 };
  return { min: Number(row.qty ?? row.qty_min ?? 0), max: Number(row.qty ?? row.qty_max ?? row.qty_min ?? 0) };
}
export function formatNfts({ min, max }) {
  return `${min === max ? min : `${min}–${max}`} ${min === 1 && max === 1 ? 'NFT' : 'NFTs'}`;
}
export function recipeOutputs(recipe) {
  const groups = new Map();
  for (const row of recipe.loot_outputs || []) {
    if (Number(row.active) !== 1 || Number(row.weight) <= 0) continue;
    const slot = Number(row.slot);
    if (!groups.has(slot)) groups.set(slot, []);
    groups.get(slot).push(row);
  }
  const slots = [...groups].sort(([a], [b]) => a - b).map(([slot, rows]) => {
    const weight = rows.reduce((sum, row) => sum + Number(row.weight), 0);
    const ranges = rows.map(nftRange);
    return { slot, min: Math.min(...ranges.map(r => r.min)), max: Math.max(...ranges.map(r => r.max)),
      rows: rows.map(row => ({ ...row, chance: Number(row.weight) / weight * 100 })) };
  });
  const total = [...(recipe.nft_outputs || []).map(nftRange), ...slots].reduce(
    (sum, row) => ({ min: sum.min + row.min, max: sum.max + row.max }), { min: 0, max: 0 });
  return { slots, total };
}
