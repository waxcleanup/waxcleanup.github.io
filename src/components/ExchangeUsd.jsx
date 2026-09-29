import React,{useEffect,useState} from 'react';
import {fetchShopUsdRate,estimatedUsd} from '../services/shopUsd';
export default function ExchangeUsd({token,amount,now}) {
  const [rate,setRate]=useState(null);
  useEffect(()=>{let active=true;setRate(null);
    const update=()=>fetchShopUsdRate({token:token.symbol,token_contract:token.contract,decimals:token.precision}).then(value=>{if(active)setRate(value);}).catch(()=>{if(active)setRate(null);});
    update();const timer=setInterval(update,60000);return ()=>{active=false;clearInterval(timer);};
  },[token]);
  return <small className="exchange-usd">{estimatedUsd(amount,rate,now) || (Number(amount)>0?'USD estimate unavailable':'Approximate USD value')} · Alcor estimate</small>;
}
