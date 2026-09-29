import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import ExchangeChart from './ExchangeChart';
jest.mock('../services/exchangeHistory',()=>({chartCandles:()=>[{time:1,open:1,high:2,low:1,close:2}]}));
jest.mock('lightweight-charts',()=>({createChart:()=>({addSeries:()=>({setData(){}}),timeScale:()=>({fitContent(){}}),subscribeCrosshairMove(){},remove(){}})}));
test('chart type persists across remounts and unknown preferences default to line',()=>{
 const props={points:[{timestamp:1000}],input:{symbol:'WAX'},output:{symbol:'CINDER'},range:'7d'};
 localStorage.setItem('cleanupcentr.exchange.chartKind','unknown');
 const view=render(<ExchangeChart {...props}/>);
 expect(screen.getByRole('button',{name:'Line'}).getAttribute('aria-pressed')).toBe('true');
 fireEvent.click(screen.getByRole('button',{name:'Candles'}));view.unmount();
 const next=render(<ExchangeChart {...props}/>);
 expect(screen.getByRole('button',{name:'Candles'}).getAttribute('aria-pressed')).toBe('true');
 fireEvent.click(screen.getByRole('button',{name:'Line'}));expect(localStorage.getItem('cleanupcentr.exchange.chartKind')).toBe('line');next.unmount();localStorage.clear();
});