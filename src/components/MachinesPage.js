// src/components/MachinesPage.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from '../hooks/SessionContext';
import { usePlayerResources } from '../hooks/PlayerResourcesContext';
import { rechargeUserEnergy } from '../services/userEnergyActions';
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
  const { resources, refreshResources } = usePlayerResources();

  const [wallet, setWallet] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [reactorsOwned, setReactorsOwned] = useState([]);
  const [machines, setMachines] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState(null);
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
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeBusy, setRechargeBusy] = useState(false);
  const [rechargeError, setRechargeError] = useState('');

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

  const liveEnergy = Number(resources?.energy?.max || 0) > 0
    ? Number(resources.energy.current || 0)
    : Number(userBalances.energy || 0);
  const liveEnergyMax = Number(resources?.energy?.max || 0) > 0
    ? Number(resources.energy.max || 0)
    : Number(userBalances.energyMax || 0);
  const cinderBalance = Number(resources?.cinder?.amount || 0);
  const energyPercent = liveEnergyMax > 0
    ? Math.min(100, Math.max(0, (liveEnergy / liveEnergyMax) * 100))
    : 0;
  const energyLow = liveEnergyMax > 0 && energyPercent <= 35;
  const energyRemaining = Math.max(0, liveEnergyMax - liveEnergy);
  const maxRechargeCinder = Math.max(0, Math.min(cinderBalance, energyRemaining / 2));

  const hasEnoughEnergy = useMemo(() => {
    if (!selectedRecipe) return false;

    return (
      liveEnergy >= Number(toPlain(selectedRecipe?.energy_per_batch) || 0)
    );
  }, [selectedRecipe, liveEnergy]);

  const templateNameMap = useMemo(() => {
    const map = {};
    for (const tpl of machineTemplates || []) {
      const tplId = Number(toPlain(tpl?.template_id) || 0);
      map[tplId] = toPlain(tpl?.machine_name) || 'Machine';
    }
    return map;
  }, [machineTemplates]);

  useEffect(() => {
    if (!machines.length) {
      setSelectedMachineId(null);
      return;
    }

    const selectedStillExists = machines.some(
      (machine) =>
        String(getMachineRowId(machine)) === String(selectedMachineId)
    );

    if (selectedStillExists) return;

    const running = machines.find((machine) => {
      if (typeof machine?.isRunning === 'boolean') return machine.isRunning;
      return Number(toPlain(machine?.isRunning) || 0) === 1;
    });

    const nextMachine = running || machines[0];

    if (nextMachine) {
      setSelectedMachineId(String(getMachineRowId(nextMachine)));
    }
  }, [machines, selectedMachineId]);

  const selectedMachine = useMemo(() => {
    if (!machines.length) return null;

    const found = machines.find(
      (machine) =>
        String(getMachineRowId(machine)) === String(selectedMachineId)
    );

    return found || machines[0];
  }, [machines, selectedMachineId]);

  function openRecharge() {
    setRechargeError('');
    setRechargeAmount(maxRechargeCinder > 0 ? String(Math.min(1, maxRechargeCinder)) : '');
    setRechargeOpen(true);
  }

  async function handleRechargeEnergy() {
    const amount = Number(rechargeAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setRechargeError('Enter a valid CINDER amount.');
      return;
    }
    if (amount > cinderBalance) {
      setRechargeError(`Only ${cinderBalance.toFixed(6)} CINDER is available.`);
      return;
    }
    if (amount > maxRechargeCinder + 0.000001) {
      setRechargeError(`Use at most ${maxRechargeCinder.toFixed(6)} CINDER to avoid exceeding capacity.`);
      return;
    }

    try {
      setRechargeBusy(true);
      setRechargeError('');
      await rechargeUserEnergy(amount);
      await Promise.all([refreshResources(), loadDashboard(true)]);
      setRechargeOpen(false);
      setMessage(`Loaded ${amount.toFixed(6)} CINDER into user energy.`);
    } catch (err) {
      setRechargeError(err?.message || 'Energy recharge failed.');
    } finally {
      setRechargeBusy(false);
    }
  }

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

      <div className="machines-primary-layout">
        <div className="staked-machines-focus">
          <section className={`machine-energy-module${energyLow ? " is-low" : ""}`}>
            <div className="machines-energy-heading">
              <div>
                <span className="machines-summary-label">Machine Energy</span>
                <strong>{formatNumber(liveEnergy, 0)} / {formatNumber(liveEnergyMax, 0)}</strong>
              </div>
              <span className="machines-energy-percent">{Math.round(energyPercent)}%</span>
            </div>
            <div className="machines-energy-track" aria-label={`${Math.round(energyPercent)}% energy remaining`}>
              <span style={{ width: `${energyPercent}%` }} />
            </div>
            <div className="machines-energy-module-foot">
              <span>{energyLow ? 'Low energy may prevent production.' : 'Available for machine production.'}</span>
              <button
                type="button"
                className="machines-energy-btn"
                onClick={openRecharge}
                disabled={liveEnergyMax <= 0 || energyRemaining <= 0 || cinderBalance <= 0}
              >
                {energyLow ? 'Recharge Energy' : energyRemaining <= 0 ? 'Energy Full' : 'Recharge'}
              </button>
            </div>
          </section>

          {machines.length === 0 ? (
            <section className="machines-panel">
              <div className="machines-panel-top">
                <h3>Staked Machines</h3>
                <span>0</span>
              </div>
              <p className="machines-muted">No machines are currently staked.</p>
            </section>
          ) : (
            <>
              {machines.length > 1 ? (
                <div className="machine-selector-wrap">
                  <label htmlFor="machine-selector">
                    Manage Reactor
                  </label>

                  <select
                    id="machine-selector"
                    className="machines-select"
                    value={
                      selectedMachineId ??
                      String(getMachineRowId(machines[0]))
                    }
                    onChange={(e) => setSelectedMachineId(e.target.value)}
                  >
                    {machines.map((machine) => {
                      const machineId = getMachineRowId(machine);

                      const running =
                        typeof machine?.isRunning === 'boolean'
                          ? machine.isRunning
                          : Number(toPlain(machine?.isRunning) || 0) === 1;

                      return (
                        <option
                          key={String(machineId)}
                          value={String(machineId)}
                        >
                          {templateNameMap[
                            Number(toPlain(machine?.template_id) || 0)
                          ] || 'Reactor'} #{machineId} - {running ? 'Running' : 'Idle'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : null}

              <MachineHeroCard
                machine={selectedMachine}
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
            </>
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

      {rechargeOpen ? (
        <div className="machines-recharge-overlay" role="presentation" onMouseDown={() => !rechargeBusy && setRechargeOpen(false)}>
          <section
            className="machines-recharge-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="machines-recharge-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="machines-recharge-header">
              <div>
                <span>Machine Room Power</span>
                <h3 id="machines-recharge-title">Recharge User Energy</h3>
              </div>
              <button type="button" onClick={() => setRechargeOpen(false)} disabled={rechargeBusy} aria-label="Close">
                &times;
              </button>
            </div>

            <div className="machines-recharge-stats">
              <div><span>Energy</span><strong>{formatNumber(liveEnergy, 0)} / {formatNumber(liveEnergyMax, 0)}</strong></div>
              <div><span>CINDER Balance</span><strong>{formatNumber(cinderBalance, 6)}</strong></div>
              <div><span>Maximum Load</span><strong>{formatNumber(maxRechargeCinder, 6)} CINDER</strong></div>
            </div>

            <label className="machines-recharge-field">
              <span>CINDER to load</span>
              <input
                type="number"
                min="0"
                max={maxRechargeCinder}
                step="0.000001"
                value={rechargeAmount}
                onChange={(event) => setRechargeAmount(event.target.value)}
                disabled={rechargeBusy}
              />
              <small>1 CINDER restores 2 energy.</small>
            </label>

            <div className="machines-recharge-presets">
              {[0.5, 1].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setRechargeAmount(String(Math.min(amount, maxRechargeCinder)))}
                  disabled={rechargeBusy || maxRechargeCinder <= 0}
                >
                  {amount} CINDER
                </button>
              ))}
              <button
                type="button"
                onClick={() => setRechargeAmount(String(maxRechargeCinder))}
                disabled={rechargeBusy || maxRechargeCinder <= 0}
              >
                Fill
              </button>
            </div>

            {rechargeError ? <div className="machines-recharge-error">{rechargeError}</div> : null}

            <button
              type="button"
              className="machines-recharge-confirm"
              onClick={handleRechargeEnergy}
              disabled={rechargeBusy || maxRechargeCinder <= 0}
            >
              {rechargeBusy ? 'Confirming...' : 'Load Energy'}
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
}