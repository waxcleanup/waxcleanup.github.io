import React, {useEffect,useMemo,useRef,useState} from 'react';
import {chartCandles} from '../services/exchangeHistory';

export default function ExchangeChart({points,input,output,pool,range,loading,error}) {
  const host=useRef();
  const [kind,setKind]=useState(()=>{try{return localStorage.getItem('cleanupcentr.exchange.chartKind')==='candles'?'candles':'line';}catch{return 'line';}});
  useEffect(()=>{try{localStorage.setItem('cleanupcentr.exchange.chartKind',kind);}catch{/* Storage may be disabled in private browsing. */}},[kind]);
  const [hover,setHover]=useState('');
  const [chartError,setChartError]=useState(false);
  const bars=useMemo(()=>chartCandles(points,pool,input,range),[points,pool,input,range]);
  useEffect(()=>{
    if (!bars.length || loading || error) return undefined;
    let disposed=false, chart;
    setChartError(false);setHover('');
    import('lightweight-charts').then(({createChart,LineSeries,CandlestickSeries})=>{
      if (disposed || !host.current) return;
      chart=createChart(host.current,{autoSize:true,height:260,layout:{background:{type:'solid',color:'#142019'},textColor:'#a9bba8',attributionLogo:true},grid:{vertLines:{color:'#25372b'},horzLines:{color:'#25372b'}},timeScale:{timeVisible:true,secondsVisible:false},localization:{priceFormatter:value=>Number(value).toLocaleString(undefined,{maximumSignificantDigits:7})},rightPriceScale:{borderColor:'#3b513c'}});
      const series=chart.addSeries(kind==='line'?LineSeries:CandlestickSeries,{color:'#c7eb87',upColor:'#7dd3a7',downColor:'#ed937b',wickUpColor:'#7dd3a7',wickDownColor:'#ed937b',borderVisible:false,priceFormat:{type:'custom',minMove:0.000000000001,formatter:value=>Number(value).toLocaleString(undefined,{maximumSignificantDigits:7})}});
      series.setData(kind==='line'?bars.map(bar=>({time:bar.time,value:bar.close})):bars);
      chart.timeScale().fitContent();
      chart.subscribeCrosshairMove(event=>{
        const value=event.seriesData.get(series);
        setHover(value ? `${new Date(Number(event.time)*1000).toLocaleString()} · ${kind==='line' ? Number(value.value).toPrecision(7) : `O ${Number(value.open).toPrecision(5)}  H ${Number(value.high).toPrecision(5)}  L ${Number(value.low).toPrecision(5)}  C ${Number(value.close).toPrecision(5)}`}` : '');
      });
    }).catch(()=>{if(!disposed)setChartError(true);});
    return ()=>{disposed=true;chart?.remove();};
  },[bars,kind,loading,error]);
  if (loading) return <div className="exchange-chart-empty" role="status">Loading pool history…</div>;
  if (error || chartError) return <div className="exchange-chart-empty">Chart unavailable. Swap quotes remain available.</div>;
  if (!bars.length) return <div className="exchange-chart-empty">No swaps in this period. Try a longer range.</div>;
  const last=bars[bars.length-1];
  return <>
    <div className="exchange-chart-top"><div className="exchange-price">{last.close.toLocaleString(undefined,{maximumSignificantDigits:7})}<small> {output.symbol} / {input.symbol}</small></div><div className="exchange-range">{['line','candles'].map(value=><button key={value} aria-pressed={kind===value} onClick={()=>setKind(value)}>{value==='line'?'Line':'Candles'}</button>)}</div></div>
    <div className="exchange-chart-hover">{hover || `Last swap ${new Date(points[points.length-1].timestamp).toLocaleString()}`}</div>
    <div ref={host} className="exchange-interactive-chart" aria-label={`${input.symbol}/${output.symbol} interactive price chart`} />
    <p className="exchange-muted">{points.partial?'Partial history · latest 10,000 swaps maximum':'Full period queried'} · {points.length.toLocaleString()} swaps · {range==='1h'?'1-minute':range==='24h'?'15-minute':range==='30d'?'4-hour':'Hourly'} pool-price bars · times on axis in UTC.</p>
    <small className="exchange-chart-credit">Data: Alcor · <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">TradingView Lightweight Charts™</a> · Copyright © 2025 TradingView, Inc.</small>
  </>;
}
