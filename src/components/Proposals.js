// src/components/Proposals.js
import React, { useEffect, useState, useCallback } from 'react';
import './Proposals.css';
import VoteModal from './VoteModal';

const Proposals = ({ proposals, handleVote, handleUnstake }) => {
  const [secondsLeftMap, setSecondsLeftMap] = useState({});
  const gateway =
    process.env.REACT_APP_IPFS_GATEWAY || 'https://maestrobeatz.servegame.com/ipfs';

  const [voteModalOpen, setVoteModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [selectedVoteFor, setSelectedVoteFor] = useState(true);

  const normalizeIPFS = (value) => {
    if (!value) return '';
    const clean = String(value)
      .replace(/^ipfs:\/\//, '')
      .replace(/^https?:\/\/[^/]+\/ipfs\//, '')
      .replace(/^\/ipfs\//, '');
    return `${gateway}/${clean}`;
  };

  const formatSeconds = useCallback((sec) => {
    if (sec == null) return 'Loading...';
    const s = Number(sec);
    if (!Number.isFinite(s)) return 'Loading...';
    if (s <= 0) return 'Voting closed';

    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = Math.floor(s % 60);
    return `${hours}h ${minutes}m ${seconds}s`;
  }, []);

  // ✅ Proposal cap formatter (shows in table)
  const formatCap = useCallback((v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString() : '—';
  }, []);

  // Initialize remaining seconds from API (seconds_left)
  useEffect(() => {
    if (!proposals || !proposals.length) {
      setSecondsLeftMap({});
      return;
    }

    const next = {};
    for (const p of proposals) {
      if (p?.prop_id == null) continue;
      const sec = Number(p.seconds_left);
      if (Number.isFinite(sec)) next[p.prop_id] = Math.max(0, Math.floor(sec));
    }
    setSecondsLeftMap(next);
  }, [proposals]);

  // Tick down locally every second
  useEffect(() => {
    if (!proposals || !proposals.length) return;

    const interval = setInterval(() => {
      setSecondsLeftMap((prev) => {
        const next = { ...prev };
        for (const pid of Object.keys(next)) {
          next[pid] = Math.max(0, next[pid] - 1);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [proposals]);

  // Only show proposals that are still open (based on seconds_left)
  const visibleProposals = (proposals || []).filter((p) => {
    const sec = secondsLeftMap[p.prop_id];
    if (sec == null) return true;
    return sec > 0;
  });

  const openVoteModal = (proposal, voteFor) => {
    setSelectedProposal(proposal);
    setSelectedVoteFor(!!voteFor);
    setVoteModalOpen(true);
  };

  const closeVoteModal = () => {
    setVoteModalOpen(false);
    setSelectedProposal(null);
  };

  const handleVoteSubmit = async ({ propId, voteFor, amountTrash }) => {
    await handleVote({ propId, voteFor, amountTrash });
    closeVoteModal();
  };

  const renderMyStake = (proposal) => {
    if (proposal?.my_staked_str) return proposal.my_staked_str;

    if (proposal?.my_staked != null) {
      const n = Number(proposal.my_staked);
      if (Number.isFinite(n)) return `${n.toFixed(3)} TRASH`;
      return String(proposal.my_staked);
    }

    return '—';
  };

  const hasStake = (proposal) => !!proposal?.has_my_stake;

  const fmtVotes = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
  };

  const renderProposer = (proposal) => {
    const proposer = proposal?.proposer;
    if (!proposer) return '—';
    return (
      <a
        href={`https://waxblock.io/account/${proposer}`}
        target="_blank"
        rel="noreferrer"
        title="View account on waxblock.io"
      >
        {proposer}
      </a>
    );
  };

  return (
    <div className="proposals-section">
      <h2>Proposals</h2>

      <VoteModal
        isOpen={voteModalOpen}
        onClose={closeVoteModal}
        proposal={selectedProposal}
        voteForDefault={selectedVoteFor}
        onSubmit={handleVoteSubmit}
      />

      {visibleProposals.length > 0 ? (
        <table className="proposals-table">
          <thead>
            <tr>
              <th>Proposal ID</th>
              <th>Proposer</th>
              <th>Type</th>
              <th>Collection</th>
              <th>Schema</th>
              <th>Template ID</th>
              <th>NFT</th>
              <th>Trash Fee</th>
              <th>Cinder Reward</th>
              {/* ✅ NEW */}
              <th>Burn Cap</th>
              <th>Votes For</th>
              <th>Votes Against</th>
              <th>My Stake</th>
              <th>Vote Deadline</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {visibleProposals.map((proposal) => {
              const sec = secondsLeftMap[proposal.prop_id];
              const remainingTime = formatSeconds(sec ?? proposal.seconds_left);
              const votingClosed = remainingTime === 'Voting closed';
              const videoUrl = normalizeIPFS(proposal.video);
              const imgUrl = normalizeIPFS(proposal.img);

              const isSchemaWide = Number(proposal.template_id) === 0;

              return (
                <tr key={proposal.prop_id} className="proposal-row">
                  <td>{proposal.prop_id}</td>
                  <td>{renderProposer(proposal)}</td>
                  <td>{proposal.proposal_type}</td>
                  <td>{proposal.collection}</td>
                  <td>{proposal.schema}</td>
                  <td>{proposal.template_id}</td>

                  <td>
                    {isSchemaWide ? (
                      <span className="schema-wide-label" title="Applies to the entire schema">
                        Schema-wide
                      </span>
                    ) : proposal.video ? (
                      <video
                        src={videoUrl}
                        title={proposal.template_name || ''}
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
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

                  {/* ✅ NEW: proposal cap (works for nftburn + schemaburn) */}
                  <td>{formatCap(proposal.proposal_cap)}</td>

                  <td>{fmtVotes(proposal.votes_for)}</td>
                  <td>{fmtVotes(proposal.votes_against)}</td>

                  <td>{renderMyStake(proposal)}</td>

                  <td>{remainingTime}</td>

                  <td className="actions">
                    {votingClosed ? (
                      <span className="voting-closed">Voting Closed</span>
                    ) : hasStake(proposal) ? (
                      <button
                        className="vote-button vote-unstake"
                        onClick={() => handleUnstake?.(proposal.prop_id)}
                        title={
                          proposal?.my_vote_for != null
                            ? `Currently voted: ${proposal.my_vote_for ? 'FOR' : 'AGAINST'}`
                            : ''
                        }
                        type="button"
                      >
                        Unstake
                      </button>
                    ) : (
                      <div className="vote-buttons">
                        <button
                          className="vote-button vote-for"
                          onClick={() => openVoteModal(proposal, true)}
                          type="button"
                        >
                          Vote For
                        </button>
                        <button
                          className="vote-button vote-against"
                          onClick={() => openVoteModal(proposal, false)}
                          type="button"
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

