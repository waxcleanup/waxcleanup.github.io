import React,{useState} from 'react';
import {tokenMetadata} from '../services/tokenMetadata';
import {TOKENS} from '../services/exchangeMath';
import './TokenLogo.css';
export default function TokenLogo({token,symbol,size=20}) {
  const resolved=token || TOKENS.find(item=>item.symbol===symbol);
  const meta=resolved ? tokenMetadata(resolved) : null;
  const logo=meta?.logo || (resolved && /^[A-Z]{1,7}$/.test(resolved.symbol) && /^[a-z1-5.]{1,13}$/.test(resolved.contract) ? `https://wax.alcor.exchange/api/v2/tokens/${resolved.symbol.toLowerCase()}-${resolved.contract}/logo` : null);
  const [failed,setFailed]=useState('');
  if(!resolved)return null;
  return logo && failed!==logo ? <img className="token-logo" style={{'--token-logo-size':`${size}px`}} src={logo} loading="lazy" alt="" width={size} height={size} onError={()=>setFailed(logo)} /> : <span className="token-logo-fallback" style={{width:size,height:size}} aria-hidden="true">{resolved.symbol?.slice(0,1) || '?'}</span>;
}
