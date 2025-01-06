import React, { useState, useEffect } from 'react';
import './App.css';
import logo from './assets/cleanupcentr.png';
import BurnRoom from './components/BurnRoom';
import { 
  fetchCollections, 
  fetchSchemas, 
  fetchTemplates, 
  fetchTemplateDetails, 
  syncCollectionData,
  fetchUserBalances,
  fetchOpenProposals,
  fetchApprovedCollections
} from './services/api';
import { submitProposal, voteOnProposal } from './services/eosActions';
import useSession from './hooks/useSession';
import ProposalModal from './components/ProposalModal';
import Proposals from './components/Proposals';
import ApprovedCollectionsPopup from './components/ApprovedCollectionsPopup';

function App() {
  const { session, handleLogin, handleLogout, error } = useSession();
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

  // State variables for user balances
  const [waxBalance, setWaxBalance] = useState('0.00000000'); 
  const [trashBalance, setTrashBalance] = useState('0.00000000'); 
  const [cinderBalance, setCinderBalance] = useState('0.00000000'); 

  // State for open proposals
  const [proposals, setProposals] = useState([]);

  // Load collections based on search term
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

  // Fetch user balances when the session is available
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

  // Fetch only open (verified) proposals when session is available
useEffect(() => {
  const loadOpenProposals = async () => {
    if (!session) return;
    try {
      const data = await fetchOpenProposals();
      console.log('Fetched proposals from backend:', data); // Debug log
      setProposals(data.proposals || []); // Ensure proposals is always an array
    } catch (error) {
      console.error('Error fetching open proposals:', error);
    }
  };
  loadOpenProposals();
}, [session]);

  // Fetch approved collections when the popup is opened
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

  // Sync and load schemas when a collection is selected
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
      console.error(`Error syncing or fetching schemas for ${collectionName}:`, error);
    } finally {
      setLoadingSync(false);
    }
  };

  // Load templates based on selected schema, fetching full details for each template
  useEffect(() => {
    const loadTemplatesWithDetails = async () => {
      if (selectedSchema) {
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
  }, [selectedSchema]);

  // Fetch template details for selected template
  const loadTemplateDetails = async (templateId) => {
    if (!selectedCollection || !templateId) return;
    try {
      const data = await fetchTemplateDetails(selectedCollection, templateId);
      setSelectedTemplateName(data.template_name || 'Unnamed Template');
      setSelectedTemplateMedia({
        img: data.img ? `https://ipfs.io/ipfs/${data.img}` : '',
        video: data.video ? `https://ipfs.io/ipfs/${data.video}` : '',
      });
    } catch (error) {
      console.error('Error loading template details:', error);
    }
  };

  // Handlers for selecting schema and template
  const handleSelectSchema = (schemaName) => setSelectedSchema(schemaName);
  const handleSelectTemplate = (templateId) => {
    const template = templates.find((t) => t.template_id === Number(templateId));
    setSelectedTemplate(template);
    loadTemplateDetails(templateId);
  };

  // Pagination handlers
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

  // Create proposal and open modal
  const handleCreateProposal = () => {
    if (!selectedTemplate || !trashFee || !cinderReward) return;
    setIsModalOpen(true);
  };

  // Submit proposal handler
const handleProposalSubmit = async () => {
  if (!selectedTemplate || !session || !trashFee || !cinderReward) return;

  // Correct formatting for TRASH and CINDER
  const formattedTrashFee = parseFloat(trashFee).toFixed(3); // TRASH requires 3 decimals
  const formattedCinderReward = parseFloat(cinderReward).toFixed(6); // CINDER requires 6 decimals

  console.log('Formatted Trash Fee:', `${formattedTrashFee} TRASH`);
  console.log('Formatted Cinder Reward:', `${formattedCinderReward} CINDER`);

  try {
    setLoading(true);
    await submitProposal({
      session,
      proposer: session.actor,
      proposal_type: 'NFT Burn',
      collection: selectedCollection,
      schema: selectedSchema,
      template_id: selectedTemplate.template_id,
      trash_fee: `${formattedTrashFee} TRASH`, // Ensure proper format
      cinder_reward: `${formattedCinderReward} CINDER`, // Ensure proper format
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

  // Handle vote action for proposals
  const handleVote = async (propId, voteFor) => {
    try {
      await voteOnProposal({ session, voter: session.actor, propId, voteFor });
      alert(`Vote ${voteFor ? 'for' : 'against'} proposal ${propId} submitted successfully!`);

      // Update the specific proposal's vote count in the state
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

  // Handle toggling the approved collections popup
  const handleTogglePopup = () => {
    setIsPopupOpen(!isPopupOpen);
  };

// Toggle Burn Room visibility and fetch user balances on close
const toggleBurnRoom = async () => {
  setIsBurnRoomOpen(!isBurnRoomOpen);

  // If the Burn Room is closing, fetch the user's balances
  if (isBurnRoomOpen) {
    try {
      const { wax, trash, cinder } = await fetchUserBalances(session.actor);
      setWaxBalance(wax);
      setTrashBalance(trash);
      setCinderBalance(cinder);
      console.log('[INFO] User balances updated after closing Burn Room.');
    } catch (error) {
      console.error('Error updating user balances:', error);
    }
  }
};

  return (
    <div className="App">
      <header className="app-header">
        <img src={logo} alt="Cleanup Logo" className="app-logo" />
        <h1 className="app-title">TheCleanupCentr</h1>
      </header>

      {!session && (
        <div style={{ 
          textAlign: 'center', 
          margin: '20px auto', 
          maxWidth: '600px', 
          padding: '20px', 
          fontSize: '18px', 
          color: '#333', 
          backgroundColor: '#e0e0e0', 
          borderRadius: '8px', 
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' 
        }}>
          Welcome to TheCleanupCentr Collection, where we lead the charge in digital sustainability. The CleanupCentr is a groundbreaking initiative aimed at reducing digital clutter on the blockchain by incentivizing the burning of old and unused NFTs. With our unique TRASH and CINDER tokens, users can actively participate in a cleaner digital ecosystem, earning rewards as they help streamline and optimize blockchain assets. Dive in, contribute to a cleaner crypto world, and collect rewards in a space where every action drives us closer to a sustainable digital future!
        </div>
      )}

      <div style={{ 
        textAlign: 'center', 
        margin: '20px auto', 
        maxWidth: '600px', 
        padding: '20px', 
        fontSize: '18px', 
        color: '#555', 
        backgroundColor: '#f8d7da', 
        borderRadius: '8px', 
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' 
      }}>
        This is currently under construction. There are bugs and features that are still being developed. For any inquiries or questions, please email <a href="mailto:cleanuptoken@gmail.com" style={{ color: '#721c24', textDecoration: 'underline' }}>cleanuptoken@gmail.com</a>.
      </div>

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      <div className="login-section">
        {!session ? (
          <button onClick={() => handleLogin('anchor')}>Login</button>
        ) : (
          <button onClick={handleLogout}>Log out</button>
        )}
      </div>

      {session && (
        <div className="balances-section" style={{ textAlign: 'center', margin: '20px 0' }}>
          <h3>User Balances</h3>
          <p>WAX: {waxBalance}</p>
          <p>TRASH: {trashBalance}</p>
          <p>CINDER: {cinderBalance}</p>
        </div>
      )}

      {/* Button to open the Burn Room */}
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
            <select onChange={(e) => handleSelectSchema(e.target.value)} style={{ marginRight: '10px', padding: '10px', borderRadius: '5px', border: '1px solid #555' }}>
              <option value="">{schemas.length > 0 ? "Select Schema" : "No schemas found"}</option>
              {schemas.map((schema) => (
                <option key={schema.schema_name} value={schema.schema_name}>
                  {schema.schema_name}
                </option>
              ))}
            </select>

            <select onChange={(e) => handleSelectTemplate(e.target.value)} style={{ marginRight: '10px', padding: '10px', borderRadius: '5px', border: '1px solid #555' }}>
              <option value="">{templates.length > 0 ? "Select Template" : "No templates found"}</option>
              {templates.map((template) => (
                <option key={template.template_id} value={template.template_id}>
                  {template.template_id} - {template.template_name || 'Unnamed Template'} (Supply: {template.circulating_supply})
                </option>
              ))}
            </select>

            {selectedTemplateName && (
              <div style={{ color: '#00ff80', marginTop: '1px' }}>
                <p>Selected Template: {selectedTemplateName}</p>
                {selectedTemplateMedia.video ? (
                  <video
                    src={selectedTemplateMedia.video}
                    alt={selectedTemplateName}
                    controls
                    autoPlay
                    style={{ maxWidth: '200px', borderRadius: '5px', marginTop: '10px' }}
                  />
                ) : selectedTemplateMedia.img ? (
                  <img
                    src={selectedTemplateMedia.img}
                    alt={selectedTemplateName}
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

          {/* Button to open approved collections popup */}
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
              {collections.map((collection) => (
                <tr key={collection.collection_name}>
                  <td>{collection.collection_name}</td>
                  <td>
                    <button onClick={() => handleSelectCollection(collection.collection_name)}>Select</button>
                  </td>
                </tr>
              ))}
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
          templateId={selectedTemplate ? selectedTemplate.template_id : ''}
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
          collections={approvedCollections.map((collection, index) => ({ ...collection, key: index }))} // Adding unique key to each collection
          onClose={handleTogglePopup}
        />
      )}
    </div>
  );
}

export default App;
