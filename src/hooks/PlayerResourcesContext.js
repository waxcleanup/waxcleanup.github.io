import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSession } from './SessionContext';
import { postWaxRpc } from '../services/waxRpcRead';

export const PLAYER_RESOURCES_REFRESH_EVENT = 'player-resources-refresh';

const PlayerResourcesContext = createContext(null);

const EMPTY_RESOURCES = {
  wax: { amount: 0, exact: '0.00000000 WAX' },
  trash: { amount: 0, exact: '0.000 TRASH' },
  cinder: { amount: 0, exact: '0.000000 CINDER' },
  tomatoe: { amount: 0, exact: '0.00000000 TOMATOE' },
  bananaz: { amount: 0, exact: '0.00000000 BANANAZ' },
  energy: { current: 0, max: 0, count: 0 },
  ram: { used: 0, max: 0 },
  cpu: { used: 0, max: 0 },
};

function parseAsset(asset, symbol, precision) {
  const fallback = `${Number(0).toFixed(precision)} ${symbol}`;
  if (!asset) return { amount: 0, exact: fallback };

  const [rawAmount] = String(asset).trim().split(' ');
  const amount = Number(rawAmount);
  return {
    amount: Number.isFinite(amount) ? amount : 0,
    exact: String(asset),
  };
}

async function fetchCurrencyBalance(account, code, symbol, precision) {
  const balances = await postWaxRpc('/v1/chain/get_currency_balance', {
    account,
    code,
    symbol,
  });

  return parseAsset(balances?.[0], symbol, precision);
}

async function fetchAccountResources(account) {
  const data = await postWaxRpc('/v1/chain/get_account', { account_name: account });

  return {
    ram: {
      used: Number(data?.ram_usage || 0),
      max: Number(data?.ram_quota || 0),
    },
    cpu: {
      used: Number(data?.cpu_limit?.used || 0),
      max: Number(data?.cpu_limit?.max || 0),
    },
  };
}

async function fetchUserEnergy(account) {
  const data = await postWaxRpc('/v1/chain/get_table_rows', {
    json: true,
    code: 'rhythmfarmer',
    scope: 'rhythmfarmer',
    table: 'userenergy',
    lower_bound: account,
    upper_bound: account,
    key_type: 'name',
    limit: 1,
  });

  const row = (data?.rows || []).find((item) => {
    const owner = item?.owner ?? item?.user ?? item?.account;
    return String(owner || '') === account;
  });

  return {
    current: Number(row?.energy ?? row?.current_energy ?? 0),
    max: Number(row?.max ?? row?.max_energy ?? 0),
    count: Number(row?.count ?? row?.cell_count ?? 0),
  };
}

export function PlayerResourcesProvider({ children }) {
  const { session } = useSession();
  const rawActor = session?.actor ?? session?.permissionLevel?.actor;
  const account = rawActor ? String(rawActor) : '';
  const [resources, setResources] = useState(EMPTY_RESOURCES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const requestIdRef = useRef(0);

  const refreshResources = useCallback(async () => {
    if (!account) return;

    const requestId = ++requestIdRef.current;
    setLoading(true);

    const requests = [
      ['wax', fetchCurrencyBalance(account, 'eosio.token', 'WAX', 8)],
      ['trash', fetchCurrencyBalance(account, 'cleanuptoken', 'TRASH', 3)],
      ['cinder', fetchCurrencyBalance(account, 'cleanuptoken', 'CINDER', 6)],
      ['tomatoe', fetchCurrencyBalance(account, 'maestrobeatz', 'TOMATOE', 8)],
      ['bananaz', fetchCurrencyBalance(account, 'maestrobeatz', 'BANANAZ', 8)],
      ['energy', fetchUserEnergy(account)],
      ['accountResources', fetchAccountResources(account)],
    ];

    const results = await Promise.allSettled(requests.map(([, promise]) => promise));
    if (requestId !== requestIdRef.current) return;

    const updates = {};
    let failureCount = 0;
    results.forEach((result, index) => {
      const key = requests[index][0];
      if (result.status === 'fulfilled') {
        if (key === 'accountResources') {
          updates.ram = result.value.ram;
          updates.cpu = result.value.cpu;
        } else {
          updates[key] = result.value;
        }
      }
      else failureCount += 1;
    });

    setResources((current) => ({ ...current, ...updates }));
    setLastUpdated(new Date());
    setError(failureCount ? 'Some balances could not be refreshed.' : '');
    setLoading(false);
  }, [account]);

  useEffect(() => {
    requestIdRef.current += 1;
    if (!account) {
      setResources(EMPTY_RESOURCES);
      setLoading(false);
      setError('');
      setLastUpdated(null);
      return undefined;
    }

    refreshResources();
    const intervalId = window.setInterval(refreshResources, 45000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshResources();
    };

    const handleTransaction = () => {
      refreshResources();
      window.setTimeout(refreshResources, 1500);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener(PLAYER_RESOURCES_REFRESH_EVENT, handleTransaction);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener(PLAYER_RESOURCES_REFRESH_EVENT, handleTransaction);
    };
  }, [account, refreshResources]);

  const value = useMemo(
    () => ({ account, resources, loading, error, lastUpdated, refreshResources }),
    [account, resources, loading, error, lastUpdated, refreshResources]
  );

  return (
    <PlayerResourcesContext.Provider value={value}>
      {children}
    </PlayerResourcesContext.Provider>
  );
}

export function usePlayerResources() {
  const context = useContext(PlayerResourcesContext);
  if (!context) {
    throw new Error('usePlayerResources must be used within PlayerResourcesProvider.');
  }
  return context;
}
