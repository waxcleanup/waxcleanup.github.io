import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "../../hooks/SessionContext";
import {
  MAESTRO_WALLET_ID,
  MAESTRO_GAMEPLAY_AUTO_SIGN_ACTIONS,
  MAESTRO_COMPANION_AUTO_SIGN_ACTIONS,
  MAESTRO_WALLET_LOGIN_REQUEST_EVENT,
  MAESTRO_WALLET_SIGN_REQUEST_EVENT,
  MAESTRO_WALLET_TERMS_VERSION,
  acceptMaestroWalletTerms,
  approveMaestroWalletSignature,
  cancelMaestroWalletLogin,
  clearMaestroWalletActivity,
  getMaestroWalletState,
  importMaestroWallet,
  lockMaestroWallet,
  removeMaestroWallet,
  rejectMaestroWalletSignature,
  setMaestroWalletAutoSign,
  selectMaestroWallet,
  subscribeMaestroWallet,
  unlockMaestroWallet,
} from "./maestroWallet";
import "./MaestroWalletPanel.css";
import maestroLogo from "./beatz_maestrobeatz.png";
import { confirmGame } from "../../services/gameNotifications";

const AUTO_LOCK_MS = 30 * 60 * 1000;

function ActionReview({ action, index }) {
  const data = action.data || {};
  const isNftTransfer =
    action.name === "transfer" && Array.isArray(data.asset_ids);
  const isTokenTransfer = action.name === "transfer" && Boolean(data.quantity);
  const isBurnRequest =
    isNftTransfer && String(data.memo || "").startsWith("burn:");
  const title = isNftTransfer
    ? "NFT transfer"
    : isTokenTransfer
      ? "Token transfer"
      : "CleanupCentr action";
  return (
    <article className={isBurnRequest ? "is-dangerous" : ""}>
      <span>Action {index + 1}</span>
      <strong>{title}</strong>
      <small>
        {action.account}::{action.name} · {action.authorization.join(", ")}
      </small>
      {(isNftTransfer || isTokenTransfer) && (
        <div className="maestro-action-summary">
          <div>
            <small>From</small>
            <strong>{String(data.from || "Unknown")}</strong>
          </div>
          <div>
            <small>Destination</small>
            <strong>{String(data.to || "Unknown")}</strong>
          </div>
          {isNftTransfer && (
            <div className="wide">
              <small>NFT asset IDs</small>
              <strong>{data.asset_ids.map(String).join(", ")}</strong>
            </div>
          )}
          {isTokenTransfer && (
            <div className="wide">
              <small>Amount</small>
              <strong>{String(data.quantity)}</strong>
            </div>
          )}
          {data.memo && (
            <div className="wide">
              <small>Memo</small>
              <strong>{String(data.memo)}</strong>
            </div>
          )}
        </div>
      )}
      {isBurnRequest && (
        <p className="maestro-action-danger">
          <strong>Permanent burn request</strong>This transfer sends the listed
          NFT to the cleanup contract with a burn memo. The resulting blockchain
          operation may be irreversible.
        </p>
      )}
      <details className="maestro-action-technical">
        <summary>Technical details</summary>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </details>
    </article>
  );
}

export default function MaestroWalletPanel() {
  const { session, handleLogin, handleLogout } = useSession();
  const [open, setOpen] = useState(false);
  const [wallet, setWallet] = useState(getMaestroWalletState());
  const [account, setAccount] = useState("");
  const [permission, setPermission] = useState("active");
  const [authorities, setAuthorities] = useState([]);
  const [privateKey, setPrivateKey] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [loginRequested, setLoginRequested] = useState(false);
  const [signRequest, setSignRequest] = useState(null);
  const [enableAutoSign, setEnableAutoSign] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [ownerRiskAccepted, setOwnerRiskAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [addingWallet, setAddingWallet] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const autoCloseTimer = useRef(null);
  const localSessionActive = session?.walletPlugin?.id === MAESTRO_WALLET_ID;
  const requestIsGameplay =
    Boolean(signRequest?.actions?.length) &&
    signRequest.actions.every(
      (action) =>
        (action.account === "rhythmfarmer" &&
          MAESTRO_GAMEPLAY_AUTO_SIGN_ACTIONS.has(action.name)) ||
        (action.account === "cleanupworld" &&
          MAESTRO_COMPANION_AUTO_SIGN_ACTIONS.has(action.name)),
    );
  const requestIsNftBurn =
    Boolean(signRequest?.actions?.length) &&
    signRequest.actions.every(
      (action) =>
        action.account === "atomicassets" &&
        action.name === "transfer" &&
        Array.isArray(action.data?.asset_ids) &&
        String(action.data?.memo || "").startsWith("burn:"),
    );
  const requestIsTokenPayment =
    Boolean(signRequest?.actions?.length) &&
    signRequest.actions.every(
      (action) =>
        action.name === "transfer" &&
        Boolean(action.data?.quantity) &&
        Boolean(action.data?.to) &&
        Boolean(action.data?.memo),
    );
  const tokenPayment = requestIsTokenPayment ? signRequest.actions[0] : null;
  const [tokenMaxAmount = "", tokenSymbol = ""] = String(
    tokenPayment?.data?.quantity || "",
  )
    .trim()
    .split(/\s+/);
  const tokenMemoPrefix = String(tokenPayment?.data?.memo || "").split(":")[0];
  const tokenAutoSignScope = tokenPayment
    ? `token|${tokenPayment.account}|${tokenPayment.data.to}|${tokenMemoPrefix}|${tokenSymbol}|${tokenMaxAmount}`
    : "";
  const offeredAutoSignScope =
    wallet.permission === "owner"
      ? ""
      : requestIsNftBurn
        ? "atomicassets.burn"
        : requestIsGameplay
          ? "rhythmfarmer.gameplay"
          : requestIsTokenPayment
            ? tokenAutoSignScope
            : "";

  useEffect(() => subscribeMaestroWallet(setWallet), []);
  useEffect(() => () => window.clearTimeout(autoCloseTimer.current), []);
  useEffect(() => {
    const lockForNavigation = () => lockMaestroWallet();
    const lockForVaultChange = (event) => {
      if (String(event.key || "").startsWith("cleanupcentr_mainnet_maestro_")) {
        lockMaestroWallet();
      }
    };
    window.addEventListener("pagehide", lockForNavigation);
    window.addEventListener("storage", lockForVaultChange);
    return () => {
      window.removeEventListener("pagehide", lockForNavigation);
      window.removeEventListener("storage", lockForVaultChange);
    };
  }, []);
  useEffect(() => {
    if (!wallet.unlocked) return undefined;
    let inactivityTimer;
    const scheduleLock = () => {
      window.clearTimeout(inactivityTimer);
      inactivityTimer = window.setTimeout(
        () => lockMaestroWallet(),
        AUTO_LOCK_MS,
      );
    };
    const activityEvents = ["pointerdown", "keydown", "touchstart", "wheel"];
    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, scheduleLock, { passive: true }),
    );
    scheduleLock();
    return () => {
      window.clearTimeout(inactivityTimer);
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, scheduleLock),
      );
    };
  }, [wallet.unlocked]);
  useEffect(() => {
    const showForLogin = () => {
      window.clearTimeout(autoCloseTimer.current);
      setLoginRequested(true);
      setMessage("Unlock or create your Maestro Wallet to continue.");
      setOpen(true);
    };
    window.addEventListener(MAESTRO_WALLET_LOGIN_REQUEST_EVENT, showForLogin);
    return () =>
      window.removeEventListener(
        MAESTRO_WALLET_LOGIN_REQUEST_EVENT,
        showForLogin,
      );
  }, []);
  useEffect(() => {
    const showForSigning = (event) => {
      window.clearTimeout(autoCloseTimer.current);
      setEnableAutoSign(false);
      setSignRequest(event.detail || { actions: [] });
      setOpen(true);
    };
    window.addEventListener(MAESTRO_WALLET_SIGN_REQUEST_EVENT, showForSigning);
    return () =>
      window.removeEventListener(
        MAESTRO_WALLET_SIGN_REQUEST_EVENT,
        showForSigning,
      );
  }, []);

  const closePanel = () => {
    window.clearTimeout(autoCloseTimer.current);
    if (signRequest) rejectMaestroWalletSignature();
    if (loginRequested) cancelMaestroWalletLogin();
    setSignRequest(null);
    setLoginRequested(false);
    setOpen(false);
    setPrivateKey('');
    setPassword('');
    setConfirmPassword('');
  };

  const finish = () => {
    setPrivateKey("");
    setPassword("");
    setConfirmPassword("");
    setOwnerRiskAccepted(false);
  };

  const importWallet = async () => {
    try {
      const result = await importMaestroWallet({
        account,
        permission,
        privateKey,
        password,
        termsAccepted: wallet.termsAccepted || termsAccepted,
        ownerRiskAccepted,
      });
      setAddingWallet(false);
      return result;
    } catch (error) {
      if (error.authorities?.length) {
        setAuthorities(error.authorities);
        setAccount(error.authorities[0].account);
        setPermission(error.authorities[0].permission);
      }
      throw error;
    }
  };

  const run = async (name, operation) => {
    setBusy(name);
    setMessage("");
    try {
      const result = await operation();
      setMessage(
        name === "test"
          ? `Local signature created (${result.signatureCount}); nothing was broadcast.`
          : `${name.charAt(0).toUpperCase()}${name.slice(1)} complete.`,
      );
      finish();
      if (name === "unlock" || name === "lock") {
        window.clearTimeout(autoCloseTimer.current);
        autoCloseTimer.current = window.setTimeout(() => setOpen(false), 2000);
      }
    } catch (error) {
      setMessage(error.message || String(error));
    } finally {
      setBusy("");
    }
  };

  const unlockAndLogin = async () => {
    await unlockMaestroWallet(password);
    if (loginRequested) {
      setLoginRequested(false);
      return;
    }
    const newSession = await handleLogin(MAESTRO_WALLET_ID);
    if (!newSession) {
      lockMaestroWallet();
      throw new Error("WharfKit could not create the local-wallet session.");
    }
  };

  return (
    <div className="maestro-wallet-entry">
      {(!session || localSessionActive) && (
        <button
          type="button"
          className="maestro-wallet-trigger"
          onClick={() => {
            window.clearTimeout(autoCloseTimer.current);
            setOpen(true);
          }}
        >
          <img src={maestroLogo} alt="" />
          Maestro Wallet
          <span className={wallet.unlocked ? "online" : ""}>
            {wallet.unlocked
              ? "Unlocked"
              : wallet.installed
                ? "Locked"
                : "Not set"}
          </span>
        </button>
      )}

      {open &&
        createPortal(
          <div
            className="maestro-wallet-backdrop"
            role="presentation"
            onMouseDown={(event) =>
              event.target === event.currentTarget && closePanel()
            }
          >
            <section
              className="maestro-wallet-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="maestro-wallet-title"
            >
              <button
                type="button"
                className="maestro-wallet-close"
                onClick={closePanel}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 7l10 10M17 7L7 17" />
                </svg>
              </button>
              <div className="maestro-wallet-brand">
                <img src={maestroLogo} alt="Maestro Wallet" />
                <div>
                  <p className="maestro-wallet-kicker">WAX Mainnet</p>
                  <h2 id="maestro-wallet-title">Maestro Wallet</h2>
                </div>
              </div>
              {signRequest && (
                <div className="maestro-wallet-confirm">
                  <p className="maestro-wallet-confirm-kicker">
                    Signature approval
                  </p>
                  <h3>Review transaction</h3>
                  <p className="maestro-wallet-confirm-note">
                    Approving creates a signature with{" "}
                    <strong>
                      {wallet.account}@{wallet.permission}
                    </strong>
                    . The requesting gameplay action may broadcast it to WAX
                    Mainnet.
                  </p>
                  {wallet.permission === "owner" && (
                    <p className="maestro-action-danger">
                      <strong>Owner-key signature</strong>This recovery
                      authority can take full control of the account. Auto-sign
                      is disabled; verify every action and authorization before
                      approving.
                    </p>
                  )}
                  <div className="maestro-wallet-action-list">
                    {signRequest.actions.map((action, index) => (
                      <ActionReview
                        action={action}
                        index={index}
                        key={`${action.account}-${action.name}-${index}`}
                      />
                    ))}
                  </div>
                  {offeredAutoSignScope && (
                    <label
                      className={`maestro-wallet-autosign-choice ${requestIsNftBurn || requestIsTokenPayment ? "is-dangerous" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={enableAutoSign}
                        onChange={(event) =>
                          setEnableAutoSign(event.target.checked)
                        }
                      />
                      <span>
                        <strong>
                          {requestIsNftBurn
                            ? "Auto-sign future NFT burn requests"
                            : requestIsTokenPayment
                              ? `Auto-sign future ${tokenMemoPrefix} payments`
                              : "Remember Auto-Sign for eligible world gameplay"}
                        </strong>
                        <small>
                          {requestIsNftBurn
                            ? "I understand future AtomicAssets transfers with a burn memo may permanently destroy NFTs without individual approval."
                            : requestIsTokenPayment
                              ? `Limited to ${tokenPayment.account}, destination ${tokenPayment.data.to}, ${tokenSymbol}, and no more than ${tokenMaxAmount} per payment.`
                              : "This preference is remembered for this account and restored after the wallet is unlocked."}{" "}
                          {requestIsGameplay
                            ? "Unknown, payment, staking, and unmatched actions still require approval."
                            : "Locking or refreshing disables this permission."}
                        </small>
                      </span>
                    </label>
                  )}
                  <div className="maestro-wallet-confirm-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        rejectMaestroWalletSignature();
                        setSignRequest(null);
                        setOpen(false);
                      }}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (enableAutoSign && offeredAutoSignScope)
                          setMaestroWalletAutoSign(true, offeredAutoSignScope);
                        approveMaestroWalletSignature();
                        setSignRequest(null);
                        setOpen(false);
                      }}
                    >
                      Approve &amp; sign
                    </button>
                  </div>
                </div>
              )}
              {!signRequest && (
                <>
                  <p className="maestro-wallet-warning">
                    Import a WAX mainnet key and its account permission will be
                    detected automatically. Only the encrypted vault is stored
                    in this browser. Losing its password means importing the key
                    again.
                  </p>

                  <div className="maestro-wallet-terms">
                    <button
                      type="button"
                      className="maestro-wallet-read-terms"
                      onClick={() => setTermsOpen(true)}
                    >
                      Read Maestro Wallet Terms &amp; Risk Disclosure
                    </button>
                    {!wallet.termsAccepted && (
                      <label className="maestro-wallet-terms-check">
                        <input
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={(event) =>
                            setTermsAccepted(event.target.checked)
                          }
                        />
                        <span>
                          I have read and accept terms version{" "}
                          {MAESTRO_WALLET_TERMS_VERSION}.
                        </span>
                      </label>
                    )}
                  </div>

                  <div className="maestro-wallet-status">
                    <span>
                      <small>Account</small>
                      <strong>{wallet.account || "Not imported"}</strong>
                    </span>
                    <span>
                      <small>Status</small>
                      <strong>
                        {wallet.unlocked
                          ? "Unlocked in memory"
                          : wallet.installed
                            ? "Locked"
                            : "Not installed"}
                      </strong>
                    </span>
                  </div>

                  {wallet.installed && (
                    <section
                      className={`maestro-wallet-activity ${activityOpen ? "open" : ""}`}
                    >
                      <button
                        type="button"
                        className="maestro-wallet-activity-toggle"
                        onClick={() => setActivityOpen((value) => !value)}
                      >
                        <span>Activity</span>
                        <small>
                          {wallet.activity?.length || 0} transaction
                          {wallet.activity?.length === 1 ? "" : "s"}
                        </small>
                        <b aria-hidden="true">{activityOpen ? "−" : "+"}</b>
                      </button>
                      {activityOpen && (
                        <div className="maestro-wallet-activity-body">
                          {wallet.activity?.length ? (
                            <div className="maestro-wallet-activity-list">
                              {wallet.activity.map((entry) => (
                                <article key={entry.transactionId}>
                                  <span className="activity-success">
                                    {entry.status === "irreversible"
                                      ? "✓"
                                      : "◷"}
                                  </span>
                                  <div>
                                    <strong>
                                      {entry.actions
                                        ?.map((action) => action.name)
                                        .join(" + ") || "Transaction"}
                                    </strong>
                                    <small>
                                      {new Date(
                                        entry.confirmedAt,
                                      ).toLocaleString()}{" "}
                                      · {entry.account}@{entry.permission} ·{" "}
                                      {entry.status === "irreversible"
                                        ? "Irreversible"
                                        : "Accepted"}
                                    </small>
                                    <code>{entry.transactionId}</code>
                                  </div>
                                  <a
                                    href={`https://waxblock.io/transaction/${entry.transactionId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    View
                                  </a>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <p>
                              No Maestro Wallet transactions recorded in this
                              browser yet.
                            </p>
                          )}
                          {wallet.activity?.length > 0 && (
                            <button
                              type="button"
                              className="maestro-wallet-clear-activity"
                              onClick={() =>
                                clearMaestroWalletActivity(wallet.account)
                              }
                            >
                              Clear local history
                            </button>
                          )}
                        </div>
                      )}
                    </section>
                  )}

                  {wallet.wallets?.length > 1 && (
                    <label className="maestro-wallet-account-select">
                      Saved account
                      <select
                        value={`${wallet.account}@${wallet.permission}`}
                        onChange={(event) => {
                          const [selectedAccount, selectedPermission] =
                            event.target.value.split("@");
                          return run("account selected", async () => {
                            if (localSessionActive) await handleLogout();
                            return selectMaestroWallet(
                              selectedAccount,
                              selectedPermission,
                            );
                          });
                        }}
                      >
                        {wallet.wallets.map((entry) => (
                          <option
                            key={`${entry.account}@${entry.permission}`}
                            value={`${entry.account}@${entry.permission}`}
                          >
                            {entry.account}@{entry.permission}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {(!wallet.installed || addingWallet) && (
                    <form
                      className="maestro-wallet-setup"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (password !== confirmPassword)
                          return setMessage("Wallet passwords do not match.");
                        return run("import", importWallet);
                      }}
                    >
                      <label className="private-key-field">
                        Private key
                        <input
                          type="password"
                          autoComplete="off"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck="false"
                          data-1p-ignore="true"
                          data-lpignore="true"
                          value={privateKey}
                          onChange={(event) => {
                            setPrivateKey(event.target.value);
                            setAuthorities([]);
                            setAccount("");
                            setPermission("active");
                            setOwnerRiskAccepted(false);
                          }}
                          placeholder="PVT_K1_… or WIF"
                        />
                      </label>
                      {authorities.length > 1 && (
                        <label className="authority-field">
                          Account permission
                          <select
                            value={`${account}@${permission}`}
                            onChange={(event) => {
                              const selected = authorities.find(
                                (entry) =>
                                  `${entry.account}@${entry.permission}` ===
                                  event.target.value,
                              );
                              if (selected) {
                                setAccount(selected.account);
                                setPermission(selected.permission);
                                setOwnerRiskAccepted(false);
                              }
                            }}
                          >
                            {authorities.map((entry) => (
                              <option
                                key={`${entry.account}@${entry.permission}`}
                                value={`${entry.account}@${entry.permission}`}
                              >
                                {entry.account}@{entry.permission}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      {permission === "owner" && (
                        <label className="maestro-wallet-terms-check maestro-owner-key-warning">
                          <input
                            type="checkbox"
                            checked={ownerRiskAccepted}
                            onChange={(event) =>
                              setOwnerRiskAccepted(event.target.checked)
                            }
                          />
                          <span>
                            <strong>High-risk recovery authority.</strong> This
                            owner key can replace permissions and take full
                            control of the WAX account. Every owner-key
                            transaction requires manual approval; auto-sign is
                            disabled.
                          </span>
                        </label>
                      )}
                      <label>
                        Local wallet password
                        <input
                          type="password"
                          autoComplete="new-password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                        />
                      </label>
                      <label>
                        Confirm password
                        <input
                          type="password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(event) =>
                            setConfirmPassword(event.target.value)
                          }
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={
                          Boolean(busy) ||
                          (!wallet.termsAccepted && !termsAccepted) ||
                          (permission === "owner" && !ownerRiskAccepted)
                        }
                      >
                        Create encrypted Maestro Wallet
                      </button>
                      {wallet.installed && (
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => {
                            setAddingWallet(false);
                            finish();
                          }}
                        >
                          Cancel adding account
                        </button>
                      )}
                    </form>
                  )}

                  {wallet.installed && !wallet.unlocked && !addingWallet && (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        return run("unlock", async () => {
                          if (!wallet.termsAccepted) {
                            if (!termsAccepted)
                              throw new Error(
                                "Accept the Maestro Wallet Terms and Risk Disclosure to continue.",
                              );
                            acceptMaestroWalletTerms();
                          }
                          return unlockAndLogin();
                        });
                      }}
                    >
                      <label>
                        Wallet password
                        <input
                          autoFocus
                          type="password"
                          autoComplete="current-password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={
                          Boolean(busy) ||
                          (!wallet.termsAccepted && !termsAccepted)
                        }
                      >
                        {!wallet.termsAccepted && !termsAccepted
                          ? "Accept terms above to unlock"
                          : "Unlock in memory"}
                      </button>
                    </form>
                  )}

                  {wallet.unlocked && (
                    <div className="maestro-wallet-actions">
                      {wallet.autoSign && (
                        <button
                          type="button"
                          className="autosign-active"
                          onClick={() =>
                            run("auto-sign disabled", () =>
                              setMaestroWalletAutoSign(false, "all"),
                            )
                          }
                        >
                          Disable all auto-sign permissions
                        </button>
                      )}
                      <button
                        type="button"
                        className="secondary"
                        onClick={() =>
                          run("lock", async () => {
                            if (localSessionActive) await handleLogout();
                            lockMaestroWallet();
                          })
                        }
                      >
                        Lock
                      </button>
                    </div>
                  )}

                  {wallet.installed && !addingWallet && (
                    <button
                      type="button"
                      className="maestro-wallet-add"
                      onClick={() =>
                        run("add account", async () => {
                          finish();
                          setAccount("");
                          setPermission("active");
                          setAuthorities([]);
                          setAddingWallet(true);
                        })
                      }
                    >
                      + Add another account key
                    </button>
                  )}

                  {wallet.installed && (
                    <button
                      type="button"
                      className="maestro-wallet-remove"
                      onClick={async () => {
                        if (
                          await confirmGame({
                            title: "Remove encrypted account?",
                            message: `Remove ${wallet.account}@${wallet.permission} from this browser? This does not affect the blockchain account.`,
                            confirmLabel: "Remove account",
                            danger: true,
                          })
                        ) {
                          run("remove", async () => {
                            if (localSessionActive) await handleLogout();
                            removeMaestroWallet();
                            if (!getMaestroWalletState().installed)
                              setTermsAccepted(false);
                          });
                        }
                      }}
                    >
                      Remove selected account
                    </button>
                  )}

                  {message && (
                    <div className="maestro-wallet-message" role="status">
                      {message}
                    </div>
                  )}
                  <small className="maestro-wallet-footnote">
                    Private keys and passwords are never sent to CleanupCentr
                    servers. Unlock state is cleared by refresh.
                  </small>
                </>
              )}
            </section>
          </div>,
          document.body,
        )}
      {termsOpen &&
        createPortal(
          <div className="maestro-terms-backdrop" role="presentation">
            <section
              className="maestro-terms-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="maestro-terms-title"
            >
              <button
                type="button"
                className="maestro-wallet-close"
                onClick={() => setTermsOpen(false)}
                aria-label="Close terms"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 7l10 10M17 7L7 17" />
                </svg>
              </button>
              <div className="maestro-terms-heading">
                <img src={maestroLogo} alt="" />
                <div>
                  <p>WAX MAINNET · IMPORTANT DISCLOSURE</p>
                  <h2 id="maestro-terms-title">
                    Maestro Wallet Terms &amp; Risk Disclosure
                  </h2>
                  <small>Version {MAESTRO_WALLET_TERMS_VERSION}</small>
                </div>
              </div>
              <div className="maestro-terms-content">
                <section>
                  <h3>Browser-local mainnet wallet</h3>
                  <p>
                    Maestro Wallet is a browser-based convenience signer
                    designed to improve CleanupCentr gameplay and transaction flow
                    on WAX Mainnet. It is experimental and is provided without a
                    guarantee that it will be uninterrupted, error-free, or
                    immune from compromise.
                  </p>
                </section>
                <section>
                  <h3>Local key storage</h3>
                  <p>
                    The private key is encrypted before being stored in this
                    browser. While the wallet is unlocked, signing material
                    exists temporarily in browser memory. The plaintext key is
                    not intentionally sent to CleanupCentr servers.
                  </p>
                </section>
                <section>
                  <h3>Security risks</h3>
                  <p>
                    Malware, unsafe browser extensions, compromised devices,
                    application vulnerabilities, dependency attacks, phishing,
                    or user error could expose signing material or cause an
                    unintended transaction. No browser wallet can guarantee that
                    a key will never be stolen.
                  </p>
                </section>
                <section>
                  <h3>Your responsibilities</h3>
                  <ul>
                    <li>
                      Use a dedicated gameplay permission where possible; mainnet actions can move real assets.
                    </li>
                    <li>
                      Keep a separate backup of your key and keep the device
                      and browser secure.
                    </li>
                    <li>
                      Review contract actions and transaction data before
                      approving them.
                    </li>
                    <li>
                      Understand that blockchain transactions may be
                      irreversible.
                    </li>
                  </ul>
                </section>
                <section>
                  <h3>No recovery</h3>
                  <p>
                    There is no password or private-key recovery service. Losing
                    the local password means removing the vault and importing
                    the key again. Clearing browser storage, changing browser
                    profiles, or changing devices can remove the encrypted
                    vault.
                  </p>
                </section>
                <section>
                  <h3>Auto-Sign</h3>
                  <p>
                    Auto-Sign is optional. The allowlisted RhythmFarmer and
                    CleanupWorld gameplay preference is stored locally per
                    account and restored only after that wallet is unlocked. NFT
                    burn and narrowly bounded token-payment permissions remain
                    session-only. Enabling burn auto-sign can permanently
                    destroy NFTs without individual confirmation. Unknown,
                    unmatched, staking, and payment actions continue to require
                    confirmation.
                  </p>
                </section>
                <section>
                  <h3>Acknowledgment</h3>
                  <p>
                    By continuing, you acknowledge these risks and accept
                    responsibility for the key you import and the transactions
                    you authorize. This disclosure does not limit rights or
                    obligations that cannot legally be waived.
                  </p>
                </section>
              </div>
              <div className="maestro-terms-footer">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setTermsOpen(false)}
                >
                  Close
                </button>
                {!wallet.termsAccepted && (
                  <button
                    type="button"
                    onClick={() => {
                      setTermsAccepted(true);
                      setTermsOpen(false);
                    }}
                  >
                    I have read, understand, and accept
                  </button>
                )}
              </div>
            </section>
          </div>,
          document.body,
        )}
    </div>
  );
}
