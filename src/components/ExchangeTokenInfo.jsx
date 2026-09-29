import React from 'react';
import TokenLogo from './TokenLogo';
import {tokenMetadata} from '../services/tokenMetadata';
export default function ExchangeTokenInfo({tokens}) {
  return <details className="exchange-card exchange-token-info"><summary>About these tokens</summary><div className="exchange-token-info-grid">{tokens.map(token=>{
    const meta=tokenMetadata(token);if(!meta)return null;
    return <article key={`${token.symbol}@${token.contract}`}><header><TokenLogo token={token} size={36}/><div><strong>{token.symbol}</strong><small>{meta.role}</small></div></header><p>{meta.description}</p><div className="exchange-token-identity"><span>{token.contract} · {token.precision} decimals</span><a href={`https://wax.alcor.exchange/analytics/tokens/${token.symbol.toLowerCase()}-${token.contract}`} target="_blank" rel="noreferrer">View on Alcor ↗</a></div></article>;
  })}</div></details>;
}
