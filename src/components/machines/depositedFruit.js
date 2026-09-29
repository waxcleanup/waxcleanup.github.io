// Presence indicators only; exact token balances remain in the control panel.
export function depositedFruit(machineId, balances = [], inputs = []) {
  const result = { tomato: false, banana: false };
  if (machineId == null) return result;
  for (const row of balances) {
    const id = row.machine_id ?? row.machineId ?? row.row_id ?? row.machineid ?? row.data?.machine_id;
    if (String(id) !== String(machineId)) continue;
    const raw = String(row.balance ?? row.quantity ?? row.amount ?? row.token_balance ?? '0');
    if (!(parseFloat(raw) > 0)) continue;
    const input = inputs.find(item => String(item.token_id) === String(row.token_id));
    const symbol = /[A-Z]+/.exec(raw)?.[0] || String(input?.token_qty ?? input?.quantity ?? input?.qty ?? input?.amount ?? '').split(' ')[1] || '';
    if (symbol === 'TOMATOE') result.tomato = true;
    if (symbol === 'BANANAZ') result.banana = true;
  }
  return result;
}
