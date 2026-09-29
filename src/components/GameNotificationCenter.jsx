import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import maestroLogo from '../wallet/maestro/beatz_maestrobeatz.png';
import { GAME_CONFIRM_EVENT, GAME_NOTICE_EVENT, GAME_TRANSACTION_EVENT } from '../services/gameNotifications';
import './GameNotificationCenter.css';

export default function GameNotificationCenter() {
  const [notices, setNotices] = useState([]);
  const [confirmation, setConfirmation] = useState(null);
  const [transaction, setTransaction] = useState(null);

  useEffect(() => {
    const onNotice = (event) => {
      const id = `${Date.now()}-${Math.random()}`;
      setNotices((rows) => [...rows.slice(-3), { id, ...event.detail }]);
      window.setTimeout(() => setNotices((rows) => rows.filter((row) => row.id !== id)), 4200);
    };
    const onConfirm = (event) => setConfirmation(event.detail);
    const onTransaction = (event) => setTransaction(event.detail || null);
    window.addEventListener(GAME_NOTICE_EVENT, onNotice);
    window.addEventListener(GAME_CONFIRM_EVENT, onConfirm);
    window.addEventListener(GAME_TRANSACTION_EVENT, onTransaction);
    return () => {
      window.removeEventListener(GAME_NOTICE_EVENT, onNotice);
      window.removeEventListener(GAME_CONFIRM_EVENT, onConfirm);
      window.removeEventListener(GAME_TRANSACTION_EVENT, onTransaction);
    };
  }, []);

  useEffect(() => {
    if (transaction?.phase !== 'success') return undefined;
    const timer = window.setTimeout(() => setTransaction(null), 2400);
    return () => window.clearTimeout(timer);
  }, [transaction]);

  const answer = (accepted) => {
    confirmation?.resolve(Boolean(accepted));
    setConfirmation(null);
  };

  const dismissConfirmation = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    answer(false);
  };

  return createPortal(<>
    <div className="game-notice-stack" aria-live="polite">{notices.map((notice) => <article className={`game-notice ${notice.type}`} key={notice.id}>
      <span>{notice.type === 'success' ? '✓' : notice.type === 'error' ? '!' : 'i'}</span>
      <p>{notice.message}</p>
      <button type="button" onClick={() => setNotices((rows) => rows.filter((row) => row.id !== notice.id))} aria-label="Dismiss">×</button>
    </article>)}</div>
    {confirmation && <div className="game-confirm-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && answer(false)}>
      <section className={`game-confirm-dialog ${confirmation.imageUrl ? 'with-preview' : ''}`} role="dialog" aria-modal="true" aria-labelledby="game-confirm-title">
        <button
          className="game-confirm-close"
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => {
            if (event.pointerType !== 'mouse') dismissConfirmation(event);
          }}
          onClick={dismissConfirmation}
          aria-label="Close confirmation"
        >×</button>
        <small>{confirmation.eyebrow || 'PLAYER CONFIRMATION'}</small><h3 id="game-confirm-title">{confirmation.title}</h3>
        <div className="game-confirm-content">
          {confirmation.imageUrl && <img src={confirmation.imageUrl} alt={confirmation.imageAlt || ''} />}
          <div className="game-confirm-copy">
            <p>{confirmation.message}</p>
            {confirmation.facts?.length > 0 && <dl>{confirmation.facts.map((fact) => <div key={`${fact.label}-${fact.value}`}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>}
          </div>
        </div>
        {confirmation.warning && <div className="game-confirm-warning"><b>{confirmation.warningLabel || 'Important'}</b><span>{confirmation.warning}</span></div>}
        <div className="game-confirm-actions"><button type="button" onClick={() => answer(false)}>{confirmation.cancelLabel || 'Cancel'}</button><button type="button" className={confirmation.danger ? 'danger' : ''} onClick={() => answer(true)}>{confirmation.confirmLabel}</button></div>
      </section>
    </div>}
    {transaction && <div className={`game-transaction-backdrop ${transaction.phase}`} role="presentation">
      <section className={`game-transaction-dialog ${transaction.phase}`} role="dialog" aria-modal="true" aria-labelledby="game-transaction-title">
        <header><img src={maestroLogo} alt="" /><div><small>MAESTRO WALLET · WAX MAINNET</small><h3 id="game-transaction-title">{transaction.title}</h3></div>{transaction.phase === 'error' && <button type="button" onClick={() => setTransaction(null)} aria-label="Close">×</button>}</header>
        <div className="game-transaction-status"><span className="game-transaction-symbol" aria-hidden="true">{transaction.phase === 'success' ? '✓' : transaction.phase === 'error' ? '!' : ''}</span><p>{transaction.message}</p></div>
        {transaction.actions?.length > 0 && <div className="game-transaction-actions">{transaction.actions.slice(0, 3).map((action, index) => <span key={`${action}-${index}`}>{action}</span>)}</div>}
        {transaction.transactionId && <div className="game-transaction-id"><small>TRANSACTION ID</small><code>{String(transaction.transactionId)}</code><button type="button" onClick={() => navigator.clipboard?.writeText(String(transaction.transactionId))}>Copy</button></div>}
        {transaction.phase === 'error' && <button className="game-transaction-dismiss" type="button" onClick={() => setTransaction(null)}>Close</button>}
      </section>
    </div>}
  </>, document.body);
}
