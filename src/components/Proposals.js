// src/components/Proposals.js
import React, { useEffect, useState, useCallback } from 'react';
import './Proposals.css';

const Proposals = ({ proposals, handleVote }) => {
  const [timeLeft, setTimeLeft] = useState({});
  const [blockchainTime, setBlockchainTime] = useState(Date.now());
  const gateway =
    process.env.REACT_APP_IPFS_GATEWAY || 'https://maestrobeatz.servegame.com/ipfs';

  const calculateRemainingTime = useCallback(
    (createdAt) => {
      const createdTime = new Date(createdAt).getTime();
      const deadline = createdTime + 24 * 60 * 60 * 1000;
      const timeRemaining = deadline - blockchainTime;

      if (timeRemaining <= 0) return 'Voting closed';

      const hours = Math.floor((timeRemaining / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((timeRemaining / (1000 * 60)) % 60);
      const seconds = Math.floor((timeRemaining / 1000) % 60);
      return `${hours}h ${minutes}m ${seconds}s`;
    },
    [blockchainTime]
  );

  useEffect(() => {
    const fetchTime = async () => {
      const response = await fetch(`${process.env.REACT_APP_RPC}/v1/chain/get_info`);
      const data = await response.json();
      const headBlockTime = new Date(data.head_block_time).getTime();
      setBlockchainTime(headBlockTime);
    };

    fetchTime();
    const interval = setInterval(fetchTime, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!proposals || !proposals.length) return;

    const interval = setInterval(() => {
      const updatedTimeLeft = proposals.reduce((acc, proposal) => {
        acc[proposal.prop_id] = calculateRemainingTime(proposal.created_at);
        return acc;
      }, {});
      setTimeLeft(updatedTimeLeft);
    }, 1000);

    return () => clearInterval(interval);
  }, [proposals, calculateRemainingTime]);

  const normalizeIPFS = (value) => {
    if (!value) return '';
    const clean = value
      .replace(/^ipfs:\/\//, '')
      .replace(/^https?:\/\/[^/]+\/ipfs\//, '')
      .replace(/^\/ipfs\//, '');
    return `${gateway}/${clean}`;
  };

  // 🔥 Only show proposals that are still open (timer not "Voting closed")
  const visibleProposals = (proposals || []).filter((proposal) => {
    const remaining = timeLeft[proposal.prop_id];

    // While timer is still loading / unknown, keep it visible
    if (!remaining || remaining === 'Loading...') return true;

    return remaining !== 'Voting closed';
  });

  return (
    <div className="proposals-section">
      <h2>Proposals</h2>
      {visibleProposals.length > 0 ? (
        <table className="proposals-table">
          <thead>
            <tr>
              <th>Proposal ID</th>
              <th>Type</th>
              <th>Collection</th>
              <th>Schema</th>
              <th>Template ID</th>
              <th>NFT</th>
              <th>Trash Fee</th>
              <th>Cinder Reward</th>
              <th>Votes For</th>
              <th>Votes Against</th>
              <th>Vote Deadline</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleProposals.map((proposal) => {
              const remainingTime = timeLeft[proposal.prop_id] || 'Loading...';
              const votingClosed = remainingTime === 'Voting closed'; // should now only happen briefly, if at all
              const videoUrl = normalizeIPFS(proposal.video);
              const imgUrl = normalizeIPFS(proposal.img);

              return (
                <tr key={proposal.prop_id} className="proposal-row">
                  <td>{proposal.prop_id}</td>
                  <td>{proposal.proposal_type}</td>
                  <td>{proposal.collection}</td>
                  <td>{proposal.schema}</td>
                  <td>{proposal.template_id}</td>
                  <td>
                    {proposal.video ? (
                      <video
                        src={videoUrl}
                        title={proposal.template_name || ''}
                        controls
                        autoPlay
                        loop
                        muted
                        type="video/mp4"
                        style={{ width: '50px', height: '50px', objectFit: 'contain' }}
                      />
                    ) : proposal.img ? (
                      <img
                        src={imgUrl}
                        alt={proposal.template_name || 'NFT'}
                        title={proposal.template_name || ''}
                        style={{ width: '50px', height: '50px', objectFit: 'contain' }}
                      />
                    ) : (
                      'Loading...'
                    )}
                  </td>
                  <td>{proposal.trash_fee}</td>
                  <td>{proposal.cinder_reward}</td>
                  <td>{Number(proposal.votes_for).toFixed(2)}</td>
                  <td>{Number(proposal.votes_against).toFixed(2)}</td>
                  <td>{remainingTime}</td>
                  <td className="actions">
                    {votingClosed ? (
                      <span className="voting-closed">Voting Closed</span>
                    ) : (
                      <div className="vote-buttons">
                        <button
                          className="vote-button vote-for"
                          onClick={() => handleVote(proposal.prop_id, true)}
                        >
                          Vote For
                        </button>
                        <button
                          className="vote-button vote-against"
                          onClick={() => handleVote(proposal.prop_id, false)}
                        >
                          Vote Against
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="no-proposals-message">No active proposals</p>
      )}
    </div>
  );
};

export default Proposals;

