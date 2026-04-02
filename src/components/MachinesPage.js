// src/components/MachinesPage.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from '../hooks/SessionContext';
import {
  claimMachine,
  depositRecipeOnly,
  fetchMachineDashboard,
  getWalletActor,
  REACTOR_RECIPE_ID,
  stakeMachine,
  startMachine,
  unstakeMachine,
} from '../services/machineActions';
import MachineHeroCard from './machines/MachineHeroCard';
import RecipeControlPanel from './machines/RecipeControlPanel';
import AvailableReactorsPanel from './machines/AvailableReactorsPanel';
import {
  toPlain,
  isLikelyWaxAccountName,
  formatNumber,
  getMachineAssetId,
  getMachineImage,
  getMachineName,
  getMachineRarity,
  getMachineRowId,
  getTemplateId,
} from './machines/machineUtils';
import './MachinesPage.css';

export default function MachinesPage({ session: sessionProp }) {
  const sessionCtx = useSession?.() || {};
  const contextSession = sessionCtx?.session || null;
  const session = sessionProp || contextSession || sessionCtx || null;

  const [wallet, setWallet] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [reactorsOwned, setReactorsOwned] = useState([]);
  const [machines, setMachines] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [machineTemplates, setMachineTemplates] = useState([]);
  const [machineInputs, setMachineInputs] = useState([]);
  const [machineLoot, setMachineLoot] = useState([]);
  const [machinePending, setMachinePending] = useState([]);
  const [machineBalances, setMachineBalances] = useState([]);
  const [userBalances, setUserBalances] = useState({
    tomatoe: 0,
    bananaz: 0,
    energy: 0,
    energyMax: 0,
  });

  const [selectedRecipeId, setSelectedRecipeId] = useState(REACTOR_RECIPE_ID);
  const [busyKey, setBusyKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadDashboard = useCallback(
    async (showSpinner = false) => {
      const rawActor =
        getWalletActor(session) ||
        session?.auth?.actorName ||
        session?.auth?.accountName ||
        session?.session?.auth?.actorName ||
        session?.session?.auth?.accountName ||
        session?.actor ||
        '';

      const actor = toPlain(rawActor);

      if (!isLikelyWaxAccountName(actor)) {
        setWallet('');
        setReactorsOwned([]);
        setMachines([]);
        setRecipes([]);
        setMachineTemplates([]);
        setMachineInputs([]);
        setMachineLoot([]);
        setMachinePending([]);
        setMachineBalances([]);
        setUserBalances({
          tomatoe: 0,
          bananaz: 0,
          energy: 0,
          energyMax: 0,
        });
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setWallet(actor);

      try {
        if (showSpinner) setRefreshing(true);
        else setLoading(true);

        const data = await fetchMachineDashboard(actor);

        setReactorsOwned(data.reactorsOwned || []);
        setMachines(data.machines || []);
        setRecipes(data.recipes || []);
        setMachineTemplates(data.machineTemplates || []);
        setMachineInputs(data.machineInputs || []);
        setMachineLoot(data.machineLoot || []);
        setMachinePending(data.machinePending || []);
        setMachineBalances(data.machineBalances || []);
        setUserBalances(
          data.userBalances || {
            tomatoe: 0,
            bananaz: 0,
            energy: 0,
            energyMax: 0,
          }
        );

        setError('');
      } catch (err) {
        console.error(err);
        setError(
          err?.response?.data?.error ||
            err?.message ||
            'Failed to load machines dashboard.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session]
  );

  useEffect(() => {
    loadDashboard(false);
  }, [loadDashboard]);

  const recipeOptions = useMemo(() => {
    return (recipes || []).filter(
      (recipe) => Number(toPlain(recipe?.active) || 0) === 1
    );
  }, [recipes]);

  const selectedRecipe = useMemo(() => {
    return (
      recipeOptions.find(
        (recipe) =>
          Number(toPlain(recipe?.recipe_id) || 0) === Number(selectedRecipeId)
      ) ||
      recipeOptions[0] ||
      null
    );
  }, [recipeOptions, selectedRecipeId]);

  const selectedRecipeInputs = useMemo(() => {
    if (!selectedRecipe) return [];
    return (machineInputs || []).filter(
      (input) =>
        Number(toPlain(input?.recipe_id) || 0) ===
        Number(toPlain(selectedRecipe?.recipe_id) || 0)
    );
  }, [machineInputs, selectedRecipe]);

  const selectedRecipeLoot = useMemo(() => {
    if (!selectedRecipe) return [];
    return (machineLoot || []).filter(
      (loot) =>
        Number(toPlain(loot?.recipe_id) || 0) ===
        Number(toPlain(selectedRecipe?.recipe_id) || 0)
    );
  }, [machineLoot, selectedRecipe]);

  const stakedMachineIds = useMemo(() => {
    const ids = new Set();

    for (const machine of machines || []) {
      const possibleIds = [
        toPlain(machine?.asset_id),
        toPlain(machine?.nft_asset_id),
        toPlain(machine?.machine_asset_id),
      ];

      for (const id of possibleIds) {
        if (id) ids.add(id);
      }
    }

    return ids;
  }, [machines]);

  const availableReactors = useMemo(() => {
    return (reactorsOwned || []).filter((reactor) => {
      const assetId = toPlain(reactor?.asset_id);
      return assetId && !stakedMachineIds.has(assetId);
    });
  }, [reactorsOwned, stakedMachineIds]);

  const tokenSufficiency = useMemo(() => {
    const map = {};

    for (const input of selectedRecipeInputs) {
      if (Number(toPlain(input?.input_type) || 0) !== 1 || !input?.token_qty) {
        continue;
      }

      const rawQty = toPlain(input?.token_qty);
      const [amount = '0', symbol = ''] = rawQty.trim().split(' ');
      const required = Number(amount || 0);
      const upperSymbol = symbol.toUpperCase();

      let balance = 0;
      if (upperSymbol === 'TOMATOE') balance = Number(userBalances.tomatoe || 0);
      else if (upperSymbol === 'BANANAZ') balance = Number(userBalances.bananaz || 0);

      map[upperSymbol] = {
        required,
        balance,
        enough: balance >= required,
        raw: rawQty,
      };
    }

    return map;
  }, [selectedRecipeInputs, userBalances]);

  const hasEnoughEnergy = useMemo(() => {
    if (!selectedRecipe) return false;

    return (
      Number(userBalances.energy || 0) >=
      Number(toPlain(selectedRecipe?.energy_per_batch) || 0)
    );
  }, [selectedRecipe, userBalances]);

  const templateNameMap = useMemo(() => {
    const map = {};
    for (const tpl of machineTemplates || []) {
      const tplId = Number(toPlain(tpl?.template_id) || 0);
      map[tplId] = toPlain(tpl?.machine_name) || 'Machine';
    }
    return map;
  }, [machineTemplates]);

  const primaryMachine = useMemo(() => {
    if (!machines.length) return null;

    const running = machines.find((m) => {
      if (typeof m?.isRunning === 'boolean') return m.isRunning;
      return Number(toPlain(m?.isRunning) || 0) === 1;
    });

    return running || machines[0];
  }, [machines]);

  async function handleStake(assetId) {
    try {
      const plainAssetId = toPlain(assetId);

      setBusyKey(`stake-${plainAssetId}`);
      setError('');
      setMessage('');
      await stakeMachine(wallet, plainAssetId);
      setMessage(`Machine ${plainAssetId} staked successfully.`);
      await loadDashboard(true);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to stake machine.');
    } finally {
      setBusyKey('');
    }
  }

  async function handleDepositOnly(machine) {
    const machineId = getMachineRowId(machine);
    const recipeId = Number(toPlain(selectedRecipe?.recipe_id) || 0);

    const machineIdMissing =
      machineId === null ||
      machineId === undefined ||
      Number.isNaN(machineId);

    if (machineIdMissing || recipeId <= 0) {
      setError('Missing machine or recipe.');
      return;
    }

    try {
      setBusyKey(`deposit-${machineId}`);
      setError('');
      setMessage('');

      await depositRecipeOnly(
        wallet,
        machineId,
        recipeId,
        selectedRecipeInputs,
        machineBalances,
        1
      );

      setMessage(
        `Deposited inputs for ${
          toPlain(selectedRecipe?.recipe_name) || 'machine recipe'
        } on machine #${machineId}.`
      );

      await loadDashboard(true);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to deposit machine inputs.');
    } finally {
      setBusyKey('');
    }
  }

  async function handleStartMachine(machine) {
    const machineId = getMachineRowId(machine);
    const recipeId = Number(toPlain(selectedRecipe?.recipe_id) || 0);

    const machineIdMissing =
      machineId === null ||
      machineId === undefined ||
      Number.isNaN(machineId);

    if (machineIdMissing || recipeId <= 0) {
      setError('Missing machine or recipe.');
      return;
    }

    try {
      setBusyKey(`start-${machineId}`);
      setError('');
      setMessage('');

      await startMachine(wallet, machineId, recipeId, 1);

      setMessage(
        `Started ${
          toPlain(selectedRecipe?.recipe_name) || 'machine recipe'
        } on machine #${machineId}.`
      );

      await loadDashboard(true);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to start machine.');
    } finally {
      setBusyKey('');
    }
  }

  async function handleClaim(machine) {
    const machineId = getMachineRowId(machine);
    const machineIdMissing =
      machineId === null ||
      machineId === undefined ||
      Number.isNaN(machineId);

    if (machineIdMissing) {
      setError('Missing machine.');
      return;
    }

    try {
      setBusyKey(`claim-${machineId}`);
      setError('');
      setMessage('');
      await claimMachine(wallet, machineId);
      setMessage(`Claimed machine #${machineId}.`);
      await loadDashboard(true);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to claim machine output.');
    } finally {
      setBusyKey('');
    }
  }

  async function handleUnstake(machine) {
    const machineId = getMachineRowId(machine);
    const machineIdMissing =
      machineId === null ||
      machineId === undefined ||
      Number.isNaN(machineId);

    if (machineIdMissing) {
      setError('Missing machine.');
      return;
    }

    try {
      setBusyKey(`unstake-${machineId}`);
      setError('');
      setMessage('');
      await unstakeMachine(wallet, machineId);
      setMessage(`Unstaked machine #${machineId}.`);
      await loadDashboard(true);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to unstake machine.');
    } finally {
      setBusyKey('');
    }
  }

  if (!wallet && !loading) {
    return (
      <div className="machines-room">
        <div className="machines-empty-state">
          <h2>Machine Room</h2>
          <p>Connect your wallet to manage reactors.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="machines-room">
      <div className="machines-header">
        <div>
          <h2>Machine Room</h2>
          <p>Stake reactors, load recipe inputs, run production, and claim outputs.</p>
        </div>

        <button
          className="machines-refresh-btn"
          onClick={() => loadDashboard(true)}
          disabled={loading || refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {message ? <div className="machines-banner success">{toPlain(message)}</div> : null}
      {error ? <div className="machines-banner error">{toPlain(error)}</div> : null}

      <div className="machines-summary-grid">
        <div className="machines-summary-card">
          <span className="machines-summary-label">Wallet</span>
          <strong>{toPlain(wallet)}</strong>
        </div>

        <div className="machines-summary-card">
          <span className="machines-summary-label">Energy</span>
          <strong>
            {formatNumber(userBalances.energy, 0)} / {formatNumber(userBalances.energyMax, 0)}
          </strong>
        </div>

        <div className="machines-summary-card">
          <span className="machines-summary-label">TOMATOE</span>
          <strong>{formatNumber(userBalances.tomatoe, 8)}</strong>
        </div>

        <div className="machines-summary-card">
          <span className="machines-summary-label">BANANAZ</span>
          <strong>{formatNumber(userBalances.bananaz, 8)}</strong>
        </div>
      </div>

      <div className="machines-primary-layout">
        <div className="staked-machines-focus">
          {machines.length === 0 ? (
            <section className="machines-panel">
              <div className="machines-panel-top">
                <h3>Staked Machines</h3>
                <span>0</span>
              </div>
              <p className="machines-muted">No machines are currently staked.</p>
            </section>
          ) : (
            <MachineHeroCard
              machine={primaryMachine}
              selectedRecipe={selectedRecipe}
              machinePending={machinePending}
              machineBalances={machineBalances}
              templateNameMap={templateNameMap}
              busyKey={busyKey}
              onDepositOnly={handleDepositOnly}
              onStartMachine={handleStartMachine}
              onClaim={handleClaim}
              onUnstake={handleUnstake}
              nowTick={nowTick}
            />
          )}
        </div>

        <div className="recipe-control-wrap">
          <RecipeControlPanel
            selectedRecipe={selectedRecipe}
            recipeOptions={recipeOptions}
            selectedRecipeInputs={selectedRecipeInputs}
            selectedRecipeLoot={selectedRecipeLoot}
            tokenSufficiency={tokenSufficiency}
            hasEnoughEnergy={hasEnoughEnergy}
            onSelectRecipe={setSelectedRecipeId}
          />
        </div>
      </div>

      <div className="available-reactors-secondary">
        <AvailableReactorsPanel
          loading={loading}
          reactors={availableReactors}
          busyKey={busyKey}
          onStake={handleStake}
          getMachineImage={getMachineImage}
          getMachineAssetId={getMachineAssetId}
          getMachineName={getMachineName}
          getTemplateId={getTemplateId}
          getMachineRarity={getMachineRarity}
        />
      </div>
    </div>
  );
}