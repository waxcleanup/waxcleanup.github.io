// components/Proposals.js
import React from 'react';

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

  return (
    <div className="proposals-section">
      <h2>Proposals</h2>
      {proposals.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr>
              <th>Proposal ID</th>
              <th>Type</th>
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
                <tr key={proposal.prop_id}>
                  <td>{proposal.prop_id}</td>
                  <td>{proposal.proposal_type}</td>
                  <td>{proposal.trash_fee}</td>
                  <td>{proposal.cinder_reward}</td>
                  <td>{formatVoteCount(proposal.votes_for)}</td> {/* Display formatted total votes for */}
                  <td>{formatVoteCount(proposal.votes_against)}</td> {/* Display formatted total votes against */}
                  <td>{remainingTime}</td>
                  <td>
                    {votingClosed ? (
                      <span style={{ color: '#888' }}>Voting Closed</span>
                    ) : (
                      <>
                        <button onClick={() => handleVote(proposal.prop_id, true)}>Vote For</button>
                        <button onClick={() => handleVote(proposal.prop_id, false)}>Vote Against</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p style={{ textAlign: 'center', color: '#888' }}>No proposals found</p>
      )}
    </div>
  );
};

export default Proposals;
