// src/components/BurnCenter.js
import React, { useState, useEffect } from 'react';
import './BurnCenter.css';
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
  fetchApprovedCollections,
  fetchSchemaBurns,
} from '../services/api';

// ✅ updated imports (proposal + vote + unstake)
import { submitProposal, voteOnProposal, unstakeVote } from '../services/eosActions';

const BurnCenter = () => {
  const { session } = useSession();

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
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    totalItems: 0,
    currentPage: 1,
    totalPages: 1,
  });

  // 💰 store numeric strings only (no units)
  const [trashFee, setTrashFee] = useState('10000'); // default 10000 TRASH
  const [cinderReward, setCinderReward] = useState('0.4'); // default 0.4 CINDER

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  // ✅ backend upgraded: template-burn approvals + schema-burn approvals
  const [approvedCollections, setApprovedCollections] = useState([]); // templates (approvednfts + tplcaps)
  const [approvedSchemas, setApprovedSchemas] = useState([]); // schemaburns + schemcaps

  const [isBurnRoomOpen, setIsBurnRoomOpen] = useState(false);

  const [waxBalance, setWaxBalance] = useState('0.00000000');
  const [trashBalance, setTrashBalance] = useState('0.00000000');
  const [cinderBalance, setCinderBalance] = useState('0.00000000');

  const [proposals, setProposals] = useState([]);

  // ---------------- Handlers ----------------

  const handleSelectSchema = (schemaName) => {
    setSelectedSchema(schemaName);
    // reset template whenever schema changes
    setSelectedTemplate(null);
    setSelectedTemplateName('');
    setSelectedTemplateMedia({ img: '', video: '' });
    setTemplateSearchTerm('');
  };

  const handleSelectTemplate = (templateId) => {
    const template = templates.find((t) => {
      if (typeof t.template_id === 'object' && t.template_id !== null) {
        return String(t.template_id.value) === String(templateId);
      }
      return String(t.template_id) === String(templateId);
    });
    setSelectedTemplate(template || null);
    loadTemplateDetails(templateId);
  };

  const clearSelectedTemplate = () => {
    setSelectedTemplate(null);
    setSelectedTemplateName('');
    setSelectedTemplateMedia({ img: '', video: '' });
    // keep search term; user may still be searching
    // setTemplateSearchTerm('');
  };

  // ---------------- API + effects ----------------

  useEffect(() => {
    const loadCollections = async () => {
      if (!searchTerm || !session?.actor) return;
      setLoading(true);
      try {
        const data = await fetchCollections(pagination.currentPage, 10, searchTerm);
        setCollections(data.collections || []);
        setPagination({
          totalItems: data.pagination?.totalItems ?? 0,
          currentPage: data.pagination?.currentPage ?? 1,
          totalPages: data.pagination?.totalPages ?? 1,
        });
      } catch (err) {
        console.error('Error loading collections:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCollections();
  }, [searchTerm, pagination.currentPage, session?.actor]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    setCollections([]);
  }, [searchTerm]);

  useEffect(() => {
    const fetchBalancesNow = async () => {
      if (!session?.actor) return;
      try {
        const { wax, trash, cinder } = await fetchUserBalances(session.actor);
        setWaxBalance(wax);
        setTrashBalance(trash);
        setCinderBalance(cinder);
      } catch (err) {
        console.error('Error fetching user balances:', err);
      }
    };
    fetchBalancesNow();
  }, [session?.actor]);

  // ✅ MUST pass the account so backend can compute has_my_stake / my_staked_str / my_vote_for
  const reloadOpenProposals = async () => {
    if (!session?.actor) return;
    try {
      const data = await fetchOpenProposals(session.actor);
      setProposals(data.proposals || []);
    } catch (err) {
      console.error('Error fetching open proposals:', err);
    }
  };

  useEffect(() => {
    reloadOpenProposals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.actor]);

  useEffect(() => {
    const loadApproved = async () => {
      if (!isPopupOpen) return;
      try {
        const [tpl, sch] = await Promise.all([fetchApprovedCollections(), fetchSchemaBurns()]);
        setApprovedCollections(tpl || []);
        setApprovedSchemas(sch || []);
      } catch (err) {
        console.error('Error fetching approved burn rules:', err);
      }
    };
    loadApproved();
  }, [isPopupOpen]);

  const handleSelectCollection = async (collectionName) => {
    setLoadingSync(true);
    setSelectedCollection(collectionName);
    setSelectedSchema('');
    setSchemas([]);
    setTemplates([]);
    setSelectedTemplate(null);
    setSelectedTemplateName('');
    setTemplateSearchTerm('');
    setSelectedTemplateMedia({ img: '', video: '' });

    // ✅ ALWAYS load schemas from DB first
    try {
      const fetchedSchemas = await fetchSchemas(collectionName);
      setSchemas(fetchedSchemas || []);
    } catch (err) {
      console.error(`Error fetching schemas for ${collectionName}:`, err);
    }

    // ⚠️ Sync is optional and MUST NOT block UI
    try {
      await syncCollectionData(collectionName);
    } catch (err) {
      console.warn(`Sync skipped for ${collectionName}:`, err?.response?.data || err?.message || err);
    } finally {
      setLoadingSync(false);
    }
  };

  useEffect(() => {
    const loadTemplatesWithDetails = async () => {
      if (!selectedSchema || !selectedCollection) {
        setTemplates([]);
        return;
      }
      try {
        setLoading(true);
        const data = await fetchTemplates(selectedCollection, selectedSchema);

        const templatesWithDetails = await Promise.all(
          (data || []).map(async (template) => {
            const tid =
              typeof template.template_id === 'object' && template.template_id !== null
                ? template.template_id.value
                : template.template_id;

            const details = await fetchTemplateDetails(selectedCollection, tid);
            return {
              ...template,
              template_id: tid,
              template_name: details?.template_name || 'Unnamed Template',
              circulating_supply: details?.circulating_supply || 0,
            };
          })
        );

        setTemplates(templatesWithDetails);
      } catch (err) {
        console.error('Error loading templates:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTemplatesWithDetails();
  }, [selectedSchema, selectedCollection]);

  const loadTemplateDetails = async (templateId) => {
    if (!selectedCollection || !templateId) return;
    try {
      const data = await fetchTemplateDetails(selectedCollection, templateId);

      const safeTemplateName =
        typeof data?.template_name === 'object' && data.template_name !== null
          ? data.template_name.value
          : data?.template_name;

      const gateway = process.env.REACT_APP_IPFS_GATEWAY || 'https://maestrobeatz.servegame.com/ipfs';

      const normalizeIPFS = (value) => {
        if (!value) return '';
        const s = String(value);
        if (s.startsWith('http')) return s;
        return `${gateway}/${s.replace(/^ipfs:\/\//, '').replace(/^\/ipfs\//, '')}`;
      };

      setSelectedTemplateName(safeTemplateName || 'Unnamed Template');
      setSelectedTemplateMedia({
        img: normalizeIPFS(data?.img),
        video: normalizeIPFS(data?.video),
      });
    } catch (err) {
      console.error('Error loading template details:', err);
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
    // Allow schema proposals without selecting a template
    if (!selectedCollection || !selectedSchema || !trashFee || !cinderReward) return;
    setIsModalOpen(true);
  };

  const handleProposalSubmit = async (payload = {}) => {
    if (!session?.actor) return;

    const stakeStr = String(payload.proposalStake ?? '').trim();
    const capStr = String(payload.cap ?? '').trim();
    const trashStr = String(payload.trashFee ?? trashFee ?? '').trim();
    const cinderStr = String(payload.cinderReward ?? cinderReward ?? '').trim();

    if (!stakeStr || !capStr || !trashStr || !cinderStr) return;

    const proposalFee = String(stakeStr.split(' ')[0] || '').trim();
    const trash_fee = String(trashStr.split(' ')[0] || '').trim();
    const cinder_reward = String(cinderStr.split(' ')[0] || '').trim();

    const tplStr = String(
      payload.templateId ??
        (selectedTemplate
          ? typeof selectedTemplate.template_id === 'object' && selectedTemplate.template_id !== null
            ? selectedTemplate.template_id.value
            : selectedTemplate.template_id
          : 0)
    );

    const tplId = Number(tplStr);

    const mode = String(payload.proposalMode ?? '').toLowerCase().trim();
    let isTemplateProposal = Number.isFinite(tplId) && tplId > 0;

    if (mode === 'schema') isTemplateProposal = false;
    if (mode === 'template') {
      if (!Number.isFinite(tplId) || tplId <= 0) {
        alert('Select a Template first, or switch to Schema Proposal.');
        return;
      }
      isTemplateProposal = true;
    }

    try {
      setLoading(true);

      await submitProposal({
        proposer: session.actor,
        proposalFee,
        collection: selectedCollection,
        schema: selectedSchema,
        template_id: isTemplateProposal ? tplId : 0,
        trash_fee,
        cinder_reward,
        cap: capStr,
        type: isTemplateProposal ? 'nftburn' : 'schemaburn',
      });

      alert('Proposal submitted successfully!');
      setIsModalOpen(false);

      await reloadOpenProposals();
    } catch (err) {
      console.error('Error submitting proposal:', err);

      const msg =
        err?.cause?.json?.error?.details?.[0]?.message ||
        err?.json?.error?.details?.[0]?.message ||
        err?.message ||
        String(err);

      alert(`Failed to submit proposal: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async ({ propId, voteFor, amountTrash }) => {
    try {
      await voteOnProposal({
        voter: session.actor,
        propId,
        voteFor,
        amountTrash,
      });

      alert(`Vote ${voteFor ? 'for' : 'against'} proposal ${propId} submitted successfully!`);
      await reloadOpenProposals();
    } catch (err) {
      console.error('Error voting on proposal FULL:', err);

      const msg =
        err?.cause?.json?.error?.details?.[0]?.message ||
        err?.json?.error?.details?.[0]?.message ||
        err?.message ||
        String(err);

      alert(`Failed to submit vote: ${msg}`);
      throw err;
    }
  };

  const handleUnstake = async (propId) => {
    try {
      await unstakeVote({ voter: session.actor, propId });

      alert(`Unstaked from proposal ${propId} successfully!`);
      await reloadOpenProposals();
    } catch (err) {
      const msg = err?.cause?.message || err?.message || String(err);

      if (/cancelled from anchor/i.test(msg) || /user rejected/i.test(msg) || /canceled/i.test(msg)) {
        console.log('[unstake] User cancelled signing:', msg);
        return;
      }

      console.error('Error unstaking FULL:', err);
      alert(`Failed to unstake: ${msg}`);
    }
  };

  const handleTogglePopup = () => {
    setIsPopupOpen((v) => !v);
  };

  const toggleBurnRoom = async () => {
    setIsBurnRoomOpen((v) => !v);

    // refresh balances when closing burn room
    if (isBurnRoomOpen && session?.actor) {
      try {
        const { wax, trash, cinder } = await fetchUserBalances(session.actor);
        setWaxBalance(wax);
        setTrashBalance(trash);
        setCinderBalance(cinder);
      } catch (err) {
        console.error('Error updating user balances:', err);
      }
    }
  };

  const filteredAndSortedTemplates = React.useMemo(() => {
    const q = String(templateSearchTerm || '').trim().toLowerCase();
    const list = Array.isArray(templates) ? [...templates] : [];

    list.sort((a, b) => {
      const ai = Number(a?.template_id || 0);
      const bi = Number(b?.template_id || 0);
      return ai - bi;
    });

    if (!q) return list;

    return list.filter((t) => {
      const idStr = String(t?.template_id ?? '').toLowerCase();
      const nameRaw = t?.template_name;
      const nameStr =
        typeof nameRaw === 'object' && nameRaw !== null
          ? String(nameRaw.value ?? '').toLowerCase()
          : String(nameRaw ?? '').toLowerCase();
      return idStr.includes(q) || nameStr.includes(q);
    });
  }, [templates, templateSearchTerm]);

  // ---------- Proposal button behavior ----------
  const canCreateProposal = !!selectedCollection && !!selectedSchema;
  const isTemplateSelected = !!selectedTemplate;

  const proposalBtnLabel = isTemplateSelected ? 'Create Template Proposal' : 'Create Schema Proposal';

  const proposalBtnBg = !canCreateProposal ? '#3a3a3a' : isTemplateSelected ? '#28a745' : '#ff8c00';

  const proposalBtnGlow = !canCreateProposal
    ? 'none'
    : isTemplateSelected
      ? '0px 0px 12px rgba(40,167,69,0.55)'
      : '0px 0px 12px rgba(255,140,0,0.55)';

  return (
    <div className="BurnCenter">
      <header className="app-header">
        <h1 className="app-title">The BurnCentr</h1>
      </header>

      {session && (
        <>
          {/* ✅ Centered via CSS (no inline margin overrides) */}
          <div className="balances-section">
            <h3>User Balances</h3>
            <p>WAX: {waxBalance}</p>
            <p>TRASH: {trashBalance}</p>
            <p>CINDER: {cinderBalance}</p>
          </div>

          {/* ✅ Approved Templates ABOVE Burn Room button */}
          <div style={{ textAlign: 'center', margin: '0 auto 18px' }}>
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

          {/* Burn Room button */}
          <div style={{ textAlign: 'center', margin: '0 auto 30px' }}>
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
        </>
      )}

      {isBurnRoomOpen && session && (
        <div className="modal-overlay">
          <div className="modal-content">
            <BurnRoom
              accountName={String(session.actor?.toString?.() || '')}
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

          {/* ✅ Selection controls stay near the search bar (before table) */}
          <div className="selection-container" style={{ marginBottom: '20px', textAlign: 'center' }}>
            {/* Schema select */}
            <select
              onChange={(e) => handleSelectSchema(e.target.value)}
              value={selectedSchema}
              style={{
                marginRight: '10px',
                padding: '10px',
                borderRadius: '5px',
                border: '1px solid #555',
              }}
            >
              <option value="">{schemas.length > 0 ? 'Select Schema' : 'No schemas found'}</option>
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

            {/* Template search input */}
            <input
              type="text"
              placeholder="Type template ID or name..."
              value={templateSearchTerm}
              onChange={(e) => setTemplateSearchTerm(e.target.value)}
              disabled={!selectedCollection || !selectedSchema}
              style={{
                marginRight: '10px',
                padding: '10px',
                width: '220px',
                borderRadius: '5px',
                border: '1px solid #555',
                fontSize: '14px',
                opacity: !selectedCollection || !selectedSchema ? 0.5 : 1,
              }}
            />

            {/* Template dropdown */}
            <select
              onChange={(e) => handleSelectTemplate(e.target.value)}
              value={
                selectedTemplate
                  ? String(
                      typeof selectedTemplate.template_id === 'object' &&
                        selectedTemplate.template_id !== null
                        ? selectedTemplate.template_id.value
                        : selectedTemplate.template_id
                    )
                  : ''
              }
              disabled={!selectedCollection || !selectedSchema}
              style={{
                marginRight: '10px',
                padding: '10px',
                borderRadius: '5px',
                border: '1px solid #555',
                opacity: !selectedCollection || !selectedSchema ? 0.5 : 1,
              }}
            >
              <option value="">
                {templates.length > 0 ? 'Select Template (optional)' : 'No templates found'}
              </option>
              {filteredAndSortedTemplates.map((template) => {
                const tId = String(template.template_id);
                const tName =
                  typeof template.template_name === 'object' && template.template_name !== null
                    ? template.template_name.value
                    : template.template_name;
                const tSupply =
                  typeof template.circulating_supply === 'object' && template.circulating_supply !== null
                    ? template.circulating_supply.value
                    : template.circulating_supply;
                return (
                  <option key={tId} value={tId}>
                    {tId} - {tName ? String(tName) : 'Unnamed Template'} (Supply: {String(tSupply)})
                  </option>
                );
              })}
            </select>

            {/* Clear template button */}
            <button
              onClick={clearSelectedTemplate}
              disabled={!selectedTemplate}
              style={{
                marginRight: '10px',
                padding: '10px 14px',
                borderRadius: '5px',
                border: '1px solid #555',
                backgroundColor: selectedTemplate ? '#444' : '#2b2b2b',
                color: '#fff',
                cursor: selectedTemplate ? 'pointer' : 'not-allowed',
                opacity: selectedTemplate ? 1 : 0.6,
              }}
              title="Clear template selection (switch back to schema mode)"
            >
              Clear Template
            </button>

            {/* Create Proposal button */}
            <button
              onClick={handleCreateProposal}
              disabled={!canCreateProposal}
              style={{
                padding: '10px 20px',
                backgroundColor: proposalBtnBg,
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: !canCreateProposal ? 'not-allowed' : 'pointer',
                boxShadow: proposalBtnGlow,
                fontWeight: 'bold',
                transition:
                  'transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease',
              }}
              title={
                !canCreateProposal
                  ? 'Select a Collection + Schema to create a proposal'
                  : isTemplateSelected
                    ? 'Template proposal (template_id > 0)'
                    : 'Schema proposal (template_id = 0)'
              }
            >
              {proposalBtnLabel}
            </button>
          </div>

          {/* Selected template preview */}
          {selectedTemplateName && (
            <div style={{ color: '#00ff80', margin: '0 0 20px 0', textAlign: 'center' }}>
              <p>Selected Template: {String(selectedTemplateName)}</p>
              {selectedTemplateMedia.video ? (
                <video
                  src={selectedTemplateMedia.video}
                  alt={String(selectedTemplateName)}
                  controls
                  autoPlay
                  style={{
                    maxWidth: '200px',
                    borderRadius: '5px',
                    marginTop: '10px',
                  }}
                />
              ) : selectedTemplateMedia.img ? (
                <img
                  src={selectedTemplateMedia.img}
                  alt={String(selectedTemplateName)}
                  style={{
                    maxWidth: '200px',
                    borderRadius: '5px',
                    marginTop: '10px',
                  }}
                />
              ) : null}
            </div>
          )}

          {/* Collections list + pagination */}
          {collections.length > 0 && (
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
                <span>
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={pagination.currentPage === pagination.totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {isModalOpen && (
        <ProposalModal
          templateId={
            selectedTemplate
              ? String(
                  typeof selectedTemplate.template_id === 'object' && selectedTemplate.template_id !== null
                    ? selectedTemplate.template_id.value
                    : selectedTemplate.template_id
                )
              : ''
          }
          collection={selectedCollection}
          schema={selectedSchema}
          proposalType={selectedTemplate ? 'Template Burn' : 'Schema Burn'}
          initialCap="10"
          initialProposalStake="100000"
          initialTrashFee={trashFee}
          initialCinderReward={cinderReward}
          setTrashFee={setTrashFee}
          setCinderReward={setCinderReward}
          handleProposalSubmit={handleProposalSubmit}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {session && (
        <div className="proposals-wrapper">
          <div className="proposals-scroll">
            <Proposals proposals={proposals} handleVote={handleVote} handleUnstake={handleUnstake} />
          </div>
        </div>
      )}

      {isPopupOpen && (
        <ApprovedCollectionsPopup
          templates={approvedCollections}
          schemas={approvedSchemas}
          onClose={handleTogglePopup}
        />
      )}
    </div>
  );
};

export default BurnCenter;

