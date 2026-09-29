import { recipeOutputs, formatNfts } from './blendPresentation';
test('counts fixed outputs plus one active outcome per slot, including zero drops', () => {
  const {total, slots} = recipeOutputs({nft_outputs:[{template_id:1,qty:4}],loot_outputs:[
    {slot:0,template_id:2,qty_min:1,qty_max:2,weight:3,active:1},
    {slot:0,template_id:0,qty_min:9,qty_max:9,weight:1,active:1},
    {slot:0,template_id:3,qty_min:99,qty_max:99,weight:5,active:0},
    {slot:1,template_id:4,qty_min:1,qty_max:1,weight:1,active:1},
  ]});
  expect(total).toEqual({min:5,max:7});
  expect(slots[0].rows.map(row=>row.chance)).toEqual([75,25]);
  expect(formatNfts(total)).toBe('5–7 NFTs');
});
