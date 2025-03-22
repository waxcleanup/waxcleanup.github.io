import React, { useEffect, useState, useCallback } from 'react';
import { fetchBlockchainTime } from '../services/api'; // Corrected path to API

const Proposals = ({ proposals, handleVote }) => {
  const [timeLeft, setTimeLeft] = useState({});
  const [blockchainTime, setBlockchainTime] = useState(Date.now()); // Default to local time initially

  const calculateRemainingTime = useCallback((createdAt) => {
    const createdTime = new Date(createdAt).getTime(); // Parse `created_at` to milliseconds
    const deadline = createdTime + 24 * 60 * 60 * 1000; // Add 24 hours
    const timeRemaining = deadline - blockchainTime;

    if (timeRemaining <= 0) {
      return 'Voting closed';
    }

    const hours = Math.floor((timeRemaining / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((timeRemaining / (1000 * 60)) % 60);
    const seconds = Math.floor((timeRemaining / 1000) % 60);
    return `${hours}h ${minutes}m ${seconds}s`;
  }, [blockchainTime]); // Dependency on `blockchainTime`

  useEffect(() => {
    const fetchTime = async () => {
      const time = await fetchBlockchainTime();
      setBlockchainTime(time);
    };

    fetchTime(); // Fetch blockchain time on component mount

    const interval = setInterval(fetchTime, 10000); // Update every 10 seconds
    return () => clearInterval(interval); // Cleanup interval on unmount
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const updatedTimeLeft = proposals.reduce((acc, proposal) => {
        acc[proposal.prop_id] = calculateRemainingTime(proposal.created_at);
        return acc;
      }, {});
      setTimeLeft(updatedTimeLeft);
    }, 1000);

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, [proposals, calculateRemainingTime]);

  return (
    <div className="proposals-section">
      <h2>Proposals</h2>
      {proposals.length > 0 ? (
        <table className="proposals-table">
          <thead>
            <tr>
              <th>Proposal ID</th>
              <th>Type</th>
              <th>Collection</th>
              <th>Schema</th>
              <th>Template ID</th>
              <th>Trash Fee</th>
              <th>Cinder Reward</th>
              <th>Votes For</th>
              <th>Votes Against</th>
              <th>Vote Deadline</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {proposals.map((proposal) => {
              const remainingTime = timeLeft[proposal.prop_id] || 'Loading...';
              const votingClosed = remainingTime === 'Voting closed';

              return (
                <tr key={proposal.prop_id} className="proposal-row">
                  <td>{proposal.prop_id}</td>
                  <td>{proposal.proposal_type}</td>
                  <td>{proposal.collection}</td>
                  <td>{proposal.schema}</td>
                  <td>{proposal.template_id}</td>
                  <td>{proposal.trash_fee}</td>
                  <td>{proposal.cinder_reward}</td>
                  <td>{Number(proposal.votes_for).toFixed(2)}</td>
                  <td>{Number(proposal.votes_against).toFixed(2)}</td>
                  <td>{remainingTime}</td>
                  <td>
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
        <p className="no-proposals-message">No proposals found</p>
      )}
    </div>
  );
};

export default Proposals;
