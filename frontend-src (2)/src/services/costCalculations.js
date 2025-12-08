import axios from 'axios';

// Constants
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL; // Backend API base URL

/**
 * Fetch the TRASH balance for a user.
 *
 * @param {string} accountName - The user's WAX account name.
 * @returns {Promise<number>} - The TRASH balance (in integer units, e.g., 10000 = 10 TRASH).
 */
export const fetchTrashBalance = async (accountName) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/balance/${accountName}/TRASH`);
    return response.data.balance || 0;
  } catch (error) {
    console.error('Error fetching TRASH balance:', error);
    return 0;
  }
};

/**
 * Fetch the CINDER balance for a user.
 *
 * @param {string} accountName - The user's WAX account name.
 * @returns {Promise<number>} - The CINDER balance (in integer units, e.g., 2000000 = 2 CINDER).
 */
export const fetchCinderBalance = async (accountName) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/balance/${accountName}/CINDER`);
    return response.data.balance || 0;
  } catch (error) {
    console.error('Error fetching CINDER balance:', error);
    return 0;
  }
};

/**
 * Calculate the cost of loading fuel.
 *
 * @param {number} amount - The amount of fuel to load.
 * @returns {number} - The cost in TRASH (e.g., 10000 for 10 TRASH).
 */
export const calculateFuelCost = (amount) => {
  const costPerUnit = 1000; // 1 TRASH per unit, in 3 decimal places
  return amount * costPerUnit;
};

/**
 * Calculate the cost of loading energy.
 *
 * @returns {number} - The cost in CINDER (e.g., 2000000 for 2 CINDER).
 */
export const calculateEnergyCost = () => {
  const fixedCost = 2000000; // 2.000000 CINDER
  return fixedCost;
};

/**
 * Calculate the cost of repairing durability.
 *
 * @param {number} repairPoints - The number of repair points to apply.
 * @returns {number} - The cost in CINDER (e.g., 1000000 for 1 CINDER per point).
 */
export const calculateRepairCost = (repairPoints) => {
  const costPerPoint = 1000000; // 1.000000 CINDER per point
  return repairPoints * costPerPoint;
};

/**
 * Check if a user has sufficient balance for a transaction.
 *
 * @param {number} userBalance - The user's balance (in integer units).
 * @param {number} requiredAmount - The required balance for the transaction (in integer units).
 * @returns {boolean} - Whether the user has enough balance.
 */
export const hasSufficientBalance = (userBalance, requiredAmount) => {
  return userBalance >= requiredAmount;
};

