// sessionConfig.js
import { SessionKit, BrowserLocalStorage } from "@wharfkit/session";
import { WebRenderer } from "@wharfkit/web-renderer";
import { WalletPluginAnchor } from "@wharfkit/wallet-plugin-anchor";
import { WalletPluginCloudWallet } from "@wharfkit/wallet-plugin-cloudwallet"; // WAX Cloud Wallet Plugin
import { MaestroWalletPlugin } from '../wallet/maestro/MaestroWalletPlugin';
import { WAX_MAINNET_CHAIN_ID, getHealthyWaxMainnetEndpoint } from '../services/waxMainnetEndpoints';

// Load configuration from environment variables
const chainId = process.env.REACT_APP_CHAINID;
const rpcEndpoint = process.env.REACT_APP_RPC;

const serverHosted = process.env.REACT_APP_SERVER_HOSTED === 'true';
const sessionStorageKey = serverHosted ? 'cleanupcentr_mainnet_session' : 'userSession';

export function assertMainnetSession(session) {
  if (chainId !== WAX_MAINNET_CHAIN_ID || String(session?.chain?.id || session?.chainId || '') !== WAX_MAINNET_CHAIN_ID) {
    throw new Error('This site requires a WAX Mainnet wallet session.');
  }
  return session;
}

// Initialize sessionKit with selected wallet plugins and configuration
const sessionKit = new SessionKit({
  appName: "TheCleanUpCentr",
  chains: [
    {
      id: chainId,
      url: rpcEndpoint,
      nativeToken: {
        symbol: "WAX",
        precision: 8,
        logo: "https://wax.bloks.io/img/wallet/logos/logo-128.png"
      }
    },
  ],
  ui: new WebRenderer(),
  walletPlugins: [
    new MaestroWalletPlugin(),
    new WalletPluginAnchor(),
    new WalletPluginCloudWallet({
      metadata: {
        name: 'WAX Cloud Wallet',
        logo: 'https://wallet.wax.io/images/favicon-32x32.png',
      },
      network: {
        chainId: chainId,
        rpcEndpoint: rpcEndpoint,
      }
    })
  ]
}, serverHosted ? { storage: new BrowserLocalStorage('cleanupcentr-mainnet') } : {});

export const ensureSessionEndpoint = async () => {
  const endpoint = await getHealthyWaxMainnetEndpoint({ force: true });
  sessionKit.setEndpoint(WAX_MAINNET_CHAIN_ID, endpoint);
  return endpoint;
};

// Save session data to local storage
export const saveSession = (session) => {
  if (!session) return;
  const sessionData = JSON.stringify({
    actor: session.actor,
    permission: session.permission,
    chainId: session.chainId,
    walletPlugin: session.walletPlugin?.id || '',
    sessionId: session.sessionId || 'default-session',
  });
  localStorage.setItem(sessionStorageKey, sessionData);
};

// Restore session from local storage
export const restoreSession = async () => {
  const storedSession = localStorage.getItem(sessionStorageKey);
  if (storedSession) {
    try {
      const restoredSession = await sessionKit.restore({ chain: WAX_MAINNET_CHAIN_ID });
      return assertMainnetSession(restoredSession);
    } catch (error) {
      console.error('Failed to restore session:', error);
      localStorage.removeItem(sessionStorageKey); // Clean up corrupted session if any
    }
  }
  return null;
};

// Clear session from storage (if needed for logout or session invalidation)
export const clearSession = () => {
  localStorage.removeItem(sessionStorageKey);
};

export default sessionKit;
