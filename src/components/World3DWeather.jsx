import { useEffect, useState } from 'react';
import axios from 'axios';

export default function useWorld3DWeather() {
  const [state, setState] = useState({ condition: '', status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    let timer;
    const base = (process.env.REACT_APP_BACKEND_API_BASE_URL || process.env.REACT_APP_API_BASE_URL || 'http://localhost:3003').replace(/\/$/, '');
    const refresh = async () => {
      try {
        const { data } = await axios.get(`${base}/weather/current`, { signal: controller.signal, timeout: 15000 });
        if (!controller.signal.aborted) setState({ condition: String(data?.condition || ''), status: data?.condition ? 'live' : 'unavailable' });
      } catch {
        if (!controller.signal.aborted) setState({ condition: '', status: 'unavailable' });
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(refresh, 60000);
      }
    };
    refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, []);
  const code = state.condition.toLowerCase();
  const snow = /snow|sleet|blizzard|hail/.test(code);
  const rain = !snow && /rain|shower|storm|drizzle|flood|hurricane/.test(code) && !/dust/.test(code);
  const storm = /thunder|hurricane|tornado|blizzard/.test(code);
  const haze = /fog|mist|dust/.test(code);
  const cloudy = rain || snow || storm || /cloud|overcast/.test(code);
  return { ...state, snow, rain, storm, haze, cloudy };
}
