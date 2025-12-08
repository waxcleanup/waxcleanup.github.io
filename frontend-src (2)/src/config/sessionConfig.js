// sessionConfig.js
import { SessionKit } from "@wharfkit/session";
import { WebRenderer } from "@wharfkit/web-renderer";
import { WalletPluginAnchor } from "@wharfkit/wallet-plugin-anchor";
import { WalletPluginWombat } from "@wharfkit/wallet-plugin-wombat"; // Wombat Wallet Plugin
import { WalletPluginCloudWallet } from "@wharfkit/wallet-plugin-cloudwallet"; // WAX Cloud Wallet Plugin

// Load configuration from environment variables
const chainId = process.env.REACT_APP_CHAINID;
const rpcEndpoint = process.env.REACT_APP_RPC;

console.log('Chain ID:', chainId);
console.log('RPC Endpoint:', rpcEndpoint);

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
    new WalletPluginAnchor(),
    new WalletPluginWombat({
      metadata: {
        name: 'Wombat Wallet',
        logo: 'https://wombat.app/favicon.ico',
      },
      network: {
        chainId: chainId,
        rpcEndpoint: rpcEndpoint,
      }
    }),
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
});

// Save session data to local storage
export const saveSession = (session) => {
  if (!session) return;
  const sessionData = JSON.stringify({
    actor: session.actor,
    permission: session.permission,
    chainId: session.chainId,
    walletPlugin: session.walletPlugin,
    sessionId: session.sessionId || 'default-session',
  });
  localStorage.setItem('userSession', sessionData);
};

// Restore session from local storage
export const restoreSession = async () => {
  const storedSession = localStorage.getItem('userSession');
  if (storedSession) {
    try {
      const parsedSession = JSON.parse(storedSession);
      const restoredSession = await sessionKit.restore(parsedSession);
      return restoredSession;
    } catch (error) {
      console.error('Failed to restore session:', error);
      localStorage.removeItem('userSession'); // Clean up corrupted session if any
    }
  }
  return null;
};

// Clear session from storage (if needed for logout or session invalidation)
export const clearSession = () => {
  localStorage.removeItem('userSession');
};

export default sessionKit;
