import React from 'react';
import ActivityFeed from './ActivityFeed';

export default function MarketsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Markets: Recent Activity</h1>
      <ActivityFeed />
    </div>
  );
}
