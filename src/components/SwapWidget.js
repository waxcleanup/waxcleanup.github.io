// src/components/SwapWidget.js
import React from 'react';

export default function SwapWidget() {
  return (
    <div style={{ width: '100%', maxWidth: '500px', margin: '20px auto' }}>
      <iframe
        title="Alcor Swap"
        src="http://wax.alcor.exchange/swap-widget?input=WAX-eosio.token&output=CINDER-cleanuptoken"
        width="100%"
        height="600"
        style={{ border: 'none', borderRadius: '12px' }}
        allow="clipboard-write"
      />
    </div>
  );
}
