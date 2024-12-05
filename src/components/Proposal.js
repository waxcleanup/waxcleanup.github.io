// components/Proposals.js
import React from 'react';
import './Proposals.css';

const Proposals = ({ proposals, handleVote }) => {

  // Helper function to calculate remaining time for voting deadline
  const calculateRemainingTime = (createdAt) => {
    const now = new Date();
    const createdDate = new Date(createdAt);
    const timeElapsed = now - createdDate;
    const timeRemaining = 86400000 - timeElapsed; // 24 hours in milliseconds

    if (timeRemaining <= 0) {
      return 'Voting closed';
    }

    const hours = Math.floor((timeRemaining / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((timeRemaining / (1000 * 60)) % 60);
    const seconds = Math.floor((timeRemaining / 1000) % 60);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  // Format vote count
  const formatVoteCount = (count) => {
    return Number(count).toFixed(2); // Round to 2 decimal places
  };

  // Log proposals to verify data structure
  console.log('Proposals:', proposals);

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
              const remainingTime = calculateRemainingTime(proposal.created_at);
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
                  <td>{formatVoteCount(proposal.votes_for)}</td>
                  <td>{formatVoteCount(proposal.votes_against)}</td>
                  <td>{remainingTime}</td>
                  <td>
                    {votingClosed ? (
                      <span className="voting-closed">Voting Closed</span>
                    ) : (
                      <div className="vote-buttons">
                        <button className="vote-for" onClick={() => handleVote(proposal.prop_id, true)}>Vote For</button>
                        <button className="vote-against" onClick={() => handleVote(proposal.prop_id, false)}>Vote Against</button>
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
