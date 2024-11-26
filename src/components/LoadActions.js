import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { InitTransaction } from '../hooks/useSession';

const LoadActions = ({ incineratorId, fuel, energy, fetchIncineratorData }) => {
  const [fuelAmount, setFuelAmount] = useState('');
  const [loading, setLoading] = useState(false); // For transaction loading state

  const handleLoadFuel = async () => {
    if (!Number.isInteger(Number(fuelAmount)) || Number(fuelAmount) <= 0) {
      alert('Please enter a valid fuel amount greater than 0.');
      return;
    }

    setLoading(true); // Start loading
    try {
      console.log(`Loading fuel: ${fuelAmount} units for incinerator ${incineratorId}`);

      const dataTrx = {
        actions: [
          {
            account: process.env.REACT_APP_CONTRACT_NAME,
            name: 'loadfuel',
            authorization: [{ actor: process.env.REACT_APP_ACCOUNT_NAME, permission: 'active' }],
            data: {
              user: process.env.REACT_APP_ACCOUNT_NAME,
              incinerator_id: incineratorId,
              amount: parseInt(fuelAmount, 10),
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
      setLoading(false); // End loading
    }
  };

  const handleLoadEnergy = async () => {
    setLoading(true); // Start loading
    try {
      console.log(`Loading energy for incinerator ${incineratorId}`);

      const dataTrx = {
        actions: [
          {
            account: process.env.REACT_APP_CONTRACT_NAME,
            name: 'loadenergy',
            authorization: [{ actor: process.env.REACT_APP_ACCOUNT_NAME, permission: 'active' }],
            data: {
              user: process.env.REACT_APP_ACCOUNT_NAME,
              incinerator_id: incineratorId,
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
      setLoading(false); // End loading
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
          disabled={loading} // Disable input while loading
        />
        <button onClick={handleLoadFuel} disabled={loading}>
          {loading ? 'Loading...' : 'Load Fuel'}
        </button>
      </div>
      <button onClick={handleLoadEnergy} disabled={loading}>
        {loading ? 'Loading...' : 'Load Energy'}
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
