// services/messageApi.js

import axios from 'axios';

// ✅ Use domain only (nginx handles routing)
const API_URL = (process.env.REACT_APP_API_BASE_URL || 'https://maestrobeatz.servegame.com')
  .replace(/\/+$/, '');

// Function to send a log message to the backend
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

// Function to fetch recent messages
export const fetchMessages = async () => {
  try {
    const response = await axios.get(`${API_URL}/log`);
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};