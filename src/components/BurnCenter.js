// src/components/BurnCenter.js
import React, { useState, useEffect } from 'react';
import '../App.css';
import logo from '../assets/cleanupcentr.png';
import BurnRoom from './BurnRoom';
import ProposalModal from './ProposalModal';
import Proposals from './Proposals';
import ApprovedCollectionsPopup from './ApprovedCollectionsPopup';
import useSession from '../hooks/useSession';
import { 
  fetchCollections, 
  fetchSchemas, 
  fetchTemplates, 
  fetchTemplateDetails, 
  syncCollectionData,
  fetchUserBalances,
  fetchOpenProposals,
  fetchApprovedCollections
} from '../services/api';
import { submitProposal, voteOnProposal } from '../services/eosActions';

const BurnCenter = () => {
  const { session, error } = useSession();

  // State for API-driven data and UI
  const [collections, setCollections] = useState([]);
  const [schemas, setSchemas] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [selectedSchema, setSelectedSchema] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [selectedTemplateMedia, setSelectedTemplateMedia] = useState({ img: '', video: '' });
  const [loading, setLoading] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ totalItems: 0, currentPage: 1, totalPages: 1 });
  const [trashFee, setTrashFee] = useState('10.000 TRASH');
  const [cinderReward, setCinderReward] = useState('1.000 CINDER');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [approvedCollections, setApprovedCollections] = useState([]);
  const [isBurnRoomOpen, setIsBurnRoomOpen] = useState(false);
  const [waxBalance, setWaxBalance] = useState('0.00000000'); 
  const [trashBalance, setTrashBalance] = useState('0.00000000'); 
  const [cinderBalance, setCinderBalance] = useState('0.00000000'); 
  const [proposals, setProposals] = useState([]);

  // ---------------- Handlers ----------------

  const handleSelectSchema = (schemaName) => {
    setSelectedSchema(schemaName);
  };

  const handleSelectTemplate = (templateId) => {
    const template = templates.find((t) => {
      if (typeof t.template_id === 'object' && t.template_id !== null) {
        return t.template_id.value === templateId;
      }
      return t.template_id === Number(templateId) || t.template_id === templateId;
    });
    setSelectedTemplate(template);
    loadTemplateDetails(templateId);
  };

  // ---------------- API calls and useEffects ----------------

  useEffect(() => {
    const loadCollections = async () => {
      if (!searchTerm || !session) return;
      setLoading(true);
      try {
        const data = await fetchCollections(pagination.currentPage, 10, searchTerm);
        setCollections(data.collections);
        setPagination({
          totalItems: data.pagination.totalItems,
          currentPage: data.pagination.currentPage,
          totalPages: data.pagination.totalPages,
        });
      } catch (error) {
        console.error('Error loading collections:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCollections();
  }, [searchTerm, pagination.currentPage, session]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    setCollections([]);
  }, [searchTerm]);

  useEffect(() => {
    const fetchBalances = async () => {
      if (session) {
        try {
          const { wax, trash, cinder } = await fetchUserBalances(session.actor);
          setWaxBalance(wax);
          setTrashBalance(trash);
          setCinderBalance(cinder);
        } catch (error) {
          console.error('Error fetching user balances:', error);
        }
      }
    };
    fetchBalances();
  }, [session]);

  useEffect(() => {
    const loadOpenProposals = async () => {
      if (!session) return;
      try {
        const data = await fetchOpenProposals();
        setProposals(data.proposals || []);
      } catch (error) {
        console.error('Error fetching open proposals:', error);
      }
    };
    loadOpenProposals();
  }, [session]);

  useEffect(() => {
    const loadApprovedCollections = async () => {
      if (!isPopupOpen) return;
      try {
        const data = await fetchApprovedCollections();
        setApprovedCollections(data);
      } catch (error) {
        console.error('Error fetching approved collections:', error);
      }
    };
    loadApprovedCollections();
  }, [isPopupOpen]);

  const handleSelectCollection = async (collectionName) => {
    setLoadingSync(true);
    setSelectedCollection(collectionName);
    setSelectedSchema('');
    setSchemas([]);
    setTemplates([]);
    try {
      await syncCollectionData(collectionName);
      const fetchedSchemas = await fetchSchemas(collectionName);
      setSchemas(fetchedSchemas);
    } catch (error) {
      console.error(`Error fetching schemas for ${collectionName}:`, error);
    } finally {
      setLoadingSync(false);
    }
  };

  useEffect(() => {
    const loadTemplatesWithDetails = async () => {
      if (selectedSchema && selectedCollection) {
        try {
          setLoading(true);
          const data = await fetchTemplates(selectedCollection, selectedSchema);
          const templatesWithDetails = await Promise.all(
            data.map(async (template) => {
              const details = await fetchTemplateDetails(selectedCollection, template.template_id);
              return {
                ...template,
                template_name: details.template_name || 'Unnamed Template',
                circulating_supply: details.circulating_supply || 0,
              };
            })
          );
          setTemplates(templatesWithDetails);
        } catch (error) {
          console.error('Error loading templates:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setTemplates([]);
      }
    };
    loadTemplatesWithDetails();
  }, [selectedSchema, selectedCollection]);

  const loadTemplateDetails = async (templateId) => {
    if (!selectedCollection || !templateId) return;
    try {
      const data = await fetchTemplateDetails(selectedCollection, templateId);
      const safeTemplateName =
        typeof data.template_name === 'object' && data.template_name !== null
          ? data.template_name.value
          : data.template_name;
      setSelectedTemplateName(safeTemplateName || 'Unnamed Template');
      setSelectedTemplateMedia({
        img: data.img ? `https://ipfs.io/ipfs/${data.img}` : '',
        video: data.video ? `https://ipfs.io/ipfs/${data.video}` : '',
      });
    } catch (error) {
      console.error('Error loading template details:', error);
    }
  };

  const handleNextPage = () => {
    if (pagination.currentPage < pagination.totalPages) {
      setPagination((prev) => ({ ...prev, currentPage: prev.currentPage + 1 }));
    }
  };
  const handlePreviousPage = () => {
    if (pagination.currentPage > 1) {
      setPagination((prev) => ({ ...prev, currentPage: prev.currentPage - 1 }));
    }
  };

  const handleCreateProposal = () => {
    if (!selectedTemplate || !trashFee || !cinderReward) return;
    setIsModalOpen(true);
  };

  const handleProposalSubmit = async () => {
    if (!selectedTemplate || !session || !trashFee || !cinderReward) return;
    const formattedTrashFee = parseFloat(trashFee).toFixed(3);
    const formattedCinderReward = parseFloat(cinderReward).toFixed(6);
    try {
      setLoading(true);
      await submitProposal({
        session,
        proposer: session.actor,
        proposal_type: 'NFT Burn',
        collection: selectedCollection,
        schema: selectedSchema,
        template_id:
          typeof selectedTemplate.template_id === 'object'
            ? selectedTemplate.template_id.value
            : selectedTemplate.template_id,
        trash_fee: `${formattedTrashFee} TRASH`,
        cinder_reward: `${formattedCinderReward} CINDER`,
      });
      alert('Proposal submitted successfully!');
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error submitting proposal:', error);
      alert('Failed to submit proposal.');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (propId, voteFor) => {
    try {
      await voteOnProposal({ session, voter: session.actor, propId, voteFor });
      alert(`Vote ${voteFor ? 'for' : 'against'} proposal ${propId} submitted successfully!`);
      setProposals((prevProposals) =>
        prevProposals.map((proposal) => {
          if (proposal.prop_id === propId) {
            return {
              ...proposal,
              votes_for: voteFor
                ? (parseFloat(proposal.votes_for) + 1).toFixed(2)
                : proposal.votes_for,
              votes_against: !voteFor
                ? (parseFloat(proposal.votes_against) + 1).toFixed(2)
                : proposal.votes_against,
            };
          }
          return proposal;
        })
      );
    } catch (error) {
      console.error('Error voting on proposal:', error);
      alert('Failed to submit vote.');
    }
  };

  const handleTogglePopup = () => {
    setIsPopupOpen(!isPopupOpen);
  };

  const toggleBurnRoom = async () => {
    setIsBurnRoomOpen(!isBurnRoomOpen);
    if (isBurnRoomOpen && session) {
      try {
        const { wax, trash, cinder } = await fetchUserBalances(session.actor);
        setWaxBalance(wax);
        setTrashBalance(trash);
        setCinderBalance(cinder);
      } catch (error) {
        console.error('Error updating user balances:', error);
      }
    }
  };

  return (
    <div className="BurnCenter">
      <header className="app-header">
        <img src={logo} alt="Cleanup Logo" className="app-logo" />
        <h1 className="app-title">TheCleanupCentr - Cleanup Center</h1>
      </header>

      {session && (
        <div className="balances-section" style={{ textAlign: 'center', margin: '20px 0' }}>
          <h3>User Balances</h3>
          <p>WAX: {waxBalance}</p>
          <p>TRASH: {trashBalance}</p>
          <p>CINDER: {cinderBalance}</p>
        </div>
      )}

      {session && (
        <div style={{ textAlign: 'center', margin: '30px auto' }}>
          <button
            onClick={toggleBurnRoom}
            style={{
              padding: '12px 25px',
              backgroundColor: '#ff4500',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0px 0px 10px rgba(255, 69, 0, 0.6)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              animation: 'flicker 1.5s infinite alternate',
            }}
          >
            Open Burn Room
          </button>
        </div>
      )}

      {isBurnRoomOpen && session && (
        <div className="modal-overlay">
          <div className="modal-content">
            <BurnRoom 
              accountName={session.actor} 
              session={session} 
              onClose={toggleBurnRoom} 
            />
          </div>
        </div>
      )}

      {(loading || loadingSync) && <p style={{ textAlign: 'center', color: '#888' }}>Loading...</p>}

      {session && (
        <>
          <div className="search-container" style={{ textAlign: 'center', margin: '20px 0' }}>
            <input
              type="text"
              placeholder="Search collections by name or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '10px',
                width: '80%',
                maxWidth: '200px',
                borderRadius: '5px',
                border: '1px solid #555',
                fontSize: '14px',
              }}
            />
          </div>

          <div className="selection-container" style={{ marginBottom: '20px', textAlign: 'center' }}>
            <select
              onChange={(e) => handleSelectSchema(e.target.value)}
              style={{ marginRight: '10px', padding: '10px', borderRadius: '5px', border: '1px solid #555' }}
            >
              <option value="">{schemas.length > 0 ? "Select Schema" : "No schemas found"}</option>
              {schemas.map((schema) => {
                const sName =
                  typeof schema.schema_name === 'object' && schema.schema_name !== null
                    ? schema.schema_name.value
                    : schema.schema_name;
                return (
                  <option key={String(sName)} value={String(sName)}>
                    {String(sName)}
                  </option>
                );
              })}
            </select>

            <select
              onChange={(e) => handleSelectTemplate(e.target.value)}
              style={{ marginRight: '10px', padding: '10px', borderRadius: '5px', border: '1px solid #555' }}
            >
              <option value="">{templates.length > 0 ? "Select Template" : "No templates found"}</option>
              {templates.map((template) => {
                const tId =
                  typeof template.template_id === 'object' && template.template_id !== null
                    ? template.template_id.value
                    : template.template_id;
                const tName =
                  typeof template.template_name === 'object' && template.template_name !== null
                    ? template.template_name.value
                    : template.template_name;
                const tSupply =
                  typeof template.circulating_supply === 'object' && template.circulating_supply !== null
                    ? template.circulating_supply.value
                    : template.circulating_supply;
                return (
                  <option key={String(tId)} value={String(tId)}>
                    {String(tId)} - {tName ? String(tName) : 'Unnamed Template'} (Supply: {String(tSupply)})
                  </option>
                );
              })}
            </select>

            {selectedTemplateName && (
              <div style={{ color: '#00ff80', marginTop: '1rem' }}>
                <p>Selected Template: {String(selectedTemplateName)}</p>
                {selectedTemplateMedia.video ? (
                  <video
                    src={selectedTemplateMedia.video}
                    alt={String(selectedTemplateName)}
                    controls
                    autoPlay
                    style={{ maxWidth: '200px', borderRadius: '5px', marginTop: '10px' }}
                  />
                ) : selectedTemplateMedia.img ? (
                  <img
                    src={selectedTemplateMedia.img}
                    alt={String(selectedTemplateName)}
                    style={{ maxWidth: '200px', borderRadius: '5px', marginTop: '10px' }}
                  />
                ) : null}
              </div>
            )}

            <button
              onClick={handleCreateProposal}
              disabled={!selectedTemplate}
              style={{
                padding: '10px 20px',
                backgroundColor: selectedTemplate ? '#28a745' : '#ccc',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: selectedTemplate ? 'pointer' : 'not-allowed',
              }}
            >
              Create Proposal
            </button>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <button
              onClick={handleTogglePopup}
              style={{
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
            >
              View Approved Templates
            </button>
          </div>
        </>
      )}

      {session && collections.length > 0 && (
        <div className="collections-container">
          <h2>Collections</h2>
          <table>
            <thead>
              <tr>
                <th>Collection Name</th>
                <th>Select</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((collection) => {
                const colName =
                  typeof collection.collection_name === 'object' && collection.collection_name !== null
                    ? collection.collection_name.value
                    : collection.collection_name;
                return (
                  <tr key={String(colName)}>
                    <td>{String(colName)}</td>
                    <td>
                      <button onClick={() => handleSelectCollection(String(colName))}>
                        Select
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="pagination">
            <button onClick={handlePreviousPage} disabled={pagination.currentPage === 1}>
              Previous
            </button>
            <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
            <button onClick={handleNextPage} disabled={pagination.currentPage === pagination.totalPages}>
              Next
            </button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <ProposalModal
          templateId={
            selectedTemplate
              ? typeof selectedTemplate.template_id === 'object'
                ? selectedTemplate.template_id.value
                : selectedTemplate.template_id
              : ''
          }
          proposalType="NFT Burn"
          trashFee={trashFee}
          setTrashFee={setTrashFee}
          cinderReward={cinderReward}
          setCinderReward={setCinderReward}
          handleProposalSubmit={handleProposalSubmit}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {session && (
        <Proposals proposals={proposals} handleVote={handleVote} />
      )}

      {isPopupOpen && (
        <ApprovedCollectionsPopup
          collections={approvedCollections.map((collection, index) => ({ ...collection, key: index }))}
          onClose={handleTogglePopup}
        />
      )}
    </div>
  );
};

export default BurnCenter;
