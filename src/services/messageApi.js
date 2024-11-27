// services/messageApi.js

import axios from 'axios';

// URL for the backend API
const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://maestrobeatz.servegame.com:3003';

// Function to send a log message to the backend (e.g., after a successful burn)
export const sendBurnMessage = async (message) => {
  try {
    const response = await axios.post(`${API_URL}/log`, {
      message,
    });
    return response.data;
  } catch (error) {
    console.error('Error sending burn message:', error);
    throw error;
  }
};

// Function to fetch recent messages (if the endpoint exists)
export const fetchMessages = async () => {
  try {
    const response = await axios.get(`${API_URL}/log`);
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};
