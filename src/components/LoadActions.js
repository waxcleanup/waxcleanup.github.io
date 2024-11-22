import React from 'react';
import { WaxJS } from '@waxio/waxjs/dist';

const LoadActions = ({ incineratorId, fuel, energy, fetchIncineratorData }) => {
  const wax = new WaxJS({ rpcEndpoint: process.env.REACT_APP_RPC });

  const handleLoadFuel = async () => {
    const user = wax.userAccount;
    const amount = 10; // Example amount, can be made dynamic

    try {
      const result = await wax.api.transact({
        actions: [
          {
            account: process.env.REACT_APP_CONTRACT_NAME,
            name: 'loadfuel',
            authorization: [{ actor: user, permission: 'active' }],
            data: {
              user,
              incinerator_id: incineratorId,
              amount,
            },
          },
        ],
      }, {
        blocksBehind: 3,
        expireSeconds: 30,
      });

      console.log('Fuel loaded successfully:', result);
      alert(`Successfully loaded ${amount} fuel!`);
      fetchIncineratorData(); // Refresh data after the action
    } catch (error) {
      console.error('Error loading fuel:', error);
      alert('Failed to load fuel. Please try again.');
    }
  };

  const handleLoadEnergy = async () => {
    const user = wax.userAccount;

    try {
      const result = await wax.api.transact({
        actions: [
          {
            account: process.env.REACT_APP_CONTRACT_NAME,
            name: 'loadenergy',
            authorization: [{ actor: user, permission: 'active' }],
            data: {
              user,
              incinerator_id: incineratorId,
            },
          },
        ],
      }, {
        blocksBehind: 3,
        expireSeconds: 30,
      });

      console.log('Energy loaded successfully:', result);
      alert('Energy fully loaded!');
      fetchIncineratorData(); // Refresh data after the action
    } catch (error) {
      console.error('Error loading energy:', error);
      alert('Failed to load energy. Please try again.');
    }
  };

  return (
    <div>
      <h4>Incinerator #{incineratorId}</h4>
      <p>Fuel: {fuel}</p>
      <p>Energy: {energy}</p>
      <button onClick={handleLoadFuel}>Load Fuel</button>
      <button onClick={handleLoadEnergy}>Load Energy</button>
    </div>
  );
};

export default LoadActions;
