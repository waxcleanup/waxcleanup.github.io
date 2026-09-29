// rhythmfarmer::plant: one seed, one compost, two energy split by energyratio.
export function plantingCapacity({ seeds, compost, userEnergy, farmEnergy, ratio, validSeed }) {
  if (!ratio || !validSeed) return 0;
  const cost = percent => percent > 0 ? Math.max(1, Math.floor(2 * percent / 100)) : 0;
  const userCost = cost(Number(ratio.user_ratio));
  const farmCost = cost(Number(ratio.farm_ratio));
  const values = [seeds, compost, userEnergy, farmEnergy, ratio.user_ratio, ratio.farm_ratio].map(Number);
  if (values.some(n => !Number.isFinite(n) || n < 0)) return 0;
  return Math.max(0, Math.floor(Math.min(Number(seeds), Number(compost),
    userCost ? Number(userEnergy) / userCost : Infinity,
    farmCost ? Number(farmEnergy) / farmCost : Infinity)));
}
