import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { InitTransaction } from '../hooks/useSession';

const LoadActions = ({ incineratorId, fuel, energy, fetchIncineratorData }) => {
  const [fuelAmount, setFuelAmount] = useState('');
  const [loadingFuel, setLoadingFuel] = useState(false); // For fuel transaction loading state
  const [loadingEnergy, setLoadingEnergy] = useState(false); // For energy transaction loading state

  const handleLoadFuel = async () => {
    if (!Number.isInteger(Number(fuelAmount)) || Number(fuelAmount) <= 0) {
      alert('Please enter a valid fuel amount greater than 0.');
      return;
    }

    setLoadingFuel(true); // Start loading for fuel
    try {
      console.log(`Loading fuel: ${fuelAmount} units for incinerator ${incineratorId}`);

      const dataTrx = {
        actions: [
          {
            account: 'cleanuptoken', // Token contract for TRASH
            name: 'transfer',
            authorization: [{ actor: process.env.REACT_APP_ACCOUNT_NAME, permission: 'active' }],
            data: {
              from: process.env.REACT_APP_ACCOUNT_NAME,
              to: process.env.REACT_APP_CONTRACT_NAME,
              quantity: `${Number(fuelAmount).toFixed(3)} TRASH`, // Assuming TRASH has 3 decimal places
              memo: `loadfuel:${incineratorId}`,
            },
          },
        ],
      };

      const result = await InitTransaction(dataTrx);
      console.log(`Fuel loaded successfully:`, result);
      alert(`Successfully loaded ${fuelAmount} fuel!`);

      await fetchIncineratorData(); // Refresh incinerator data
      setFuelAmount(''); // Clear the input field
    } catch (error) {
      console.error('Error loading fuel:', error);
      alert('Failed to load fuel. Please try again.');
    } finally {
      setLoadingFuel(false); // End loading for fuel
    }
  };

  const handleLoadEnergy = async () => {
    setLoadingEnergy(true); // Start loading for energy
    try {
      console.log(`Loading energy for incinerator ${incineratorId}`);

      const dataTrx = {
        actions: [
          {
            account: 'cleanuptoken', // Token contract for TRASH
            name: 'transfer',
            authorization: [{ actor: process.env.REACT_APP_ACCOUNT_NAME, permission: 'active' }],
            data: {
              from: process.env.REACT_APP_ACCOUNT_NAME,
              to: process.env.REACT_APP_CONTRACT_NAME,
              quantity: `1.000 TRASH`, // Assuming TRASH has 3 decimal places; use an appropriate fixed amount
              memo: `loadenergy:${incineratorId}`,
            },
          },
        ],
      };

      const result = await InitTransaction(dataTrx);
      console.log(`Energy loaded successfully:`, result);
      alert('Energy fully loaded!');

      await fetchIncineratorData(); // Refresh incinerator data
    } catch (error) {
      console.error('Error loading energy:', error);
      alert('Failed to load energy. Please try again.');
    } finally {
      setLoadingEnergy(false); // End loading for energy
    }
  };

  return (
    <div>
      <h4>Incinerator #{incineratorId}</h4>
      <p>Fuel: {fuel}</p>
      <p>Energy: {energy}</p>
      <div>
        <input
          type="number"
          placeholder="Enter fuel amount"
          value={fuelAmount}
          onChange={(e) => setFuelAmount(e.target.value)}
          disabled={loadingFuel || loadingEnergy} // Disable input while loading
        />
        <button onClick={handleLoadFuel} disabled={loadingFuel || loadingEnergy}>
          {loadingFuel ? 'Loading...' : 'Load Fuel'}
        </button>
      </div>
      <button onClick={handleLoadEnergy} disabled={loadingFuel || loadingEnergy}>
        {loadingEnergy ? 'Loading...' : 'Load Energy'}
      </button>
    </div>
  );
};

LoadActions.propTypes = {
  incineratorId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  fuel: PropTypes.number.isRequired,
  energy: PropTypes.number.isRequired,
  fetchIncineratorData: PropTypes.func.isRequired,
};

export default LoadActions;
