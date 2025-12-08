// src/components/SkinSelector.js
import React from 'react';

export default function SkinSelector({ skins, activeSkin, onChange }) {
  if (!skins || skins.length === 0) return null;
  return (
    <select
      value={activeSkin}
      onChange={e => onChange(e.target.value)}
      style={{ marginLeft: '1rem' }}
    >
      {skins.map(s => (
        <option key={s.id} value={s.cssClass}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
