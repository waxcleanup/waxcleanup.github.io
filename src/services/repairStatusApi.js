import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

export async function getRepairStatus(incineratorId) {
  const res = await fetch(`${API_BASE}/repair-status/${incineratorId}`);
  if (!res.ok) throw new Error('Failed to fetch repair status');
  return res.json();
}
