import axios from 'axios';

const BASE_URL = 'https://maestrobeatz.servegame.com:3003';

/**
 * Fetch staked incinerators for a given user.
 *
 * @param {string} accountName - The account name of the user.
 * @returns {Promise<Array>} - An array of staked incinerators.
 */
export const fetchStakedIncinerators = async (accountName) => {
  try {
    const response = await axios.get(`${BASE_URL}/incinerators/staked/${accountName}`);
    if (response.data.success) {
      return response.data.data; // Return the staked incinerators data
    } else {
      throw new Error('Failed to fetch staked incinerators');
    }
  } catch (error) {
    console.error('Error fetching staked incinerators:', error);
    throw error;
  }
};

/**
 * Fetch all incinerators for a given user (staked and unstaked).
 *
 * @param {string} accountName - The account name of the user.
 * @returns {Promise<Object>} - An object containing staked and unstaked incinerators.
 */
export const fetchAllIncinerators = async (accountName) => {
  try {
    const response = await axios.get(`${BASE_URL}/incinerators/${accountName}`);
    if (response.data.success) {
      return response.data.data; // Return all incinerators
    } else {
      throw new Error('Failed to fetch incinerators');
    }
  } catch (error) {
    console.error('Error fetching all incinerators:', error);
    throw error;
  }
};
