// src/services/waxGeckoApi.js
import axios from 'axios';

// Central axios instance configured with the base URL from .env
const waxGeckoApi = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Optional: set a default timeout of 10 seconds
  timeout: 10000,
});

export default waxGeckoApi;
