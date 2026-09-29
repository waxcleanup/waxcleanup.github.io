import { postWaxMainnetRpc } from './waxMainnetEndpoints';
import { updateMaestroWalletActivityFinality } from '../wallet/maestro/maestroWallet';

const POLL_INTERVAL_MS = 5000;
const MAX_MONITOR_MS = 10 * 60 * 1000;
const monitors = new Map();

export function extractTransactionBlockNumber(result) {
  const candidates = [
    result?.response?.processed?.block_num,
    result?.resolved?.response?.processed?.block_num,
    result?.processed?.block_num,
    result?.block_num,
  ];
  const blockNumber = candidates.map(Number).find((value) => Number.isSafeInteger(value) && value > 0);
  return blockNumber || 0;
}

export function monitorTransactionFinality({ transactionId, blockNumber }) {
  const id = String(transactionId || '');
  const includedBlock = Number(blockNumber || 0);
  if (!id || !Number.isSafeInteger(includedBlock) || includedBlock <= 0 || monitors.has(id)) return;

  const startedAt = Date.now();
  const check = async () => {
    try {
      const info = await postWaxMainnetRpc('/v1/chain/get_info');
      const irreversibleBlock = Number(info?.last_irreversible_block_num || 0);
      if (irreversibleBlock >= includedBlock) {
        updateMaestroWalletActivityFinality(id, {
          status: 'irreversible',
          blockNumber: includedBlock,
          irreversibleAt: new Date().toISOString(),
        });
        monitors.delete(id);
        return;
      }
    } catch (error) {
      // Endpoint failover is handled by postWaxMainnetRpc. A temporary outage
      // leaves the transaction accepted and allows the next poll to retry.
    }

    if (Date.now() - startedAt >= MAX_MONITOR_MS) {
      monitors.delete(id);
      return;
    }
    monitors.set(id, window.setTimeout(check, POLL_INTERVAL_MS));
  };

  monitors.set(id, window.setTimeout(check, POLL_INTERVAL_MS));
}
