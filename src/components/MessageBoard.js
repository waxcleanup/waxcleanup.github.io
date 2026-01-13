// src/components/MessageBoard.js
import React, { useState } from 'react';
import './MessageBoard.css';

export default function MessageBoard() {
  const [show, setShow] = useState(true);

  const latestMessage = "🎶 Beatz Wax Music Player now live! Come listen to your favorite Blockchain music and you favorite collection. Check out the free skins! New music player skins coming in the future. 🔥 Incinerators now  updated with Repair & Unstaking features. 1 Cinder = 1 Durability = 1 minute. Durability must be 500 to unstake Incinerator.";

  if (!show) return null;

  return (
    <div className="update-banner">
      <span>{latestMessage}</span>
      <button className="dismiss-button" onClick={() => setShow(false)}>✕</button>
    </div>
  );
}
