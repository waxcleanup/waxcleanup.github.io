// Clear and equip atomically so replacing a slot also resets the old NFT flag.
export function buildIncineratorEquipActions(account, user, slot, incineratorId) {
  const authorization = [{ actor: user, permission: 'active' }];
  return [
    { account, name: 'clearincslot', authorization, data: { user, slot } },
    { account, name: 'setincslot', authorization, data: { user, slot, incinerator_id: String(incineratorId) } },
  ];
}

export function canUnstakeIncinerator(incinerator, assigned = false) {
  const unequipped = [true, 1, '1'].includes(incinerator?.locked);
  return !assigned && unequipped && Number(incinerator?.durability) === 500;
}
