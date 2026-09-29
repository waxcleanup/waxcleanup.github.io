import {
  AbstractWalletPlugin,
  Checksum256,
  PermissionLevel,
  WalletPluginMetadata,
} from "@wharfkit/session";
import {
  MAESTRO_WALLET_ID,
  MAESTRO_GAMEPLAY_AUTO_SIGN_ACTIONS,
  MAESTRO_COMPANION_AUTO_SIGN_ACTIONS,
  MAINNET_CHAIN_ID,
  getMaestroTransactionDigest,
  lockMaestroWallet,
  requestMaestroWalletLogin,
  requestMaestroWalletSignature,
  requireUnlockedMaestroWallet,
  signMaestroTransaction,
} from "./maestroWallet";
import {
  autoSignAllowedForPermission,
  burnPolicyEligible,
  gameplayPolicyEligible,
  tokenPaymentPolicyEligible,
} from "./maestroPolicy";
import { updateGameTransaction } from "../../services/gameNotifications";

import maestroWalletLogo from "./beatz_maestrobeatz.png";
const maestroWalletLogoUrl = new URL(maestroWalletLogo, window.location.href).href;
function displayActionData(data) {
  try {
    return JSON.parse(
      JSON.stringify(data, (key, value) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
    );
  } catch (error) {
    return { notice: "Action data could not be displayed safely." };
  }
}

export class MaestroWalletPlugin extends AbstractWalletPlugin {
  config = {
    requiresChainSelect: false,
    requiresPermissionSelect: false,
    requiresPermissionEntry: false,
    supportedChains: [MAINNET_CHAIN_ID],
  };

  metadata = WalletPluginMetadata.from({
    name: "Maestro Wallet",
    description: "Encrypted browser-local WAX mainnet WharfKit wallet",
    logo: {
      light: maestroWalletLogoUrl,
      dark: maestroWalletLogoUrl,
    },
  });

  get id() {
    return MAESTRO_WALLET_ID;
  }

  async login(context) {
    if (String(context.chain?.id || '') !== MAINNET_CHAIN_ID)
      throw new Error('This wallet supports WAX mainnet only.');
    // WharfKit's renderer uses a native <dialog>, which lives in the browser's
    // top layer and cannot be overlaid with an application modal. Dismiss the
    // wallet chooser before handing control to the in-page Maestro flow.
    await context.ui?.onLoginComplete?.();
    await requestMaestroWalletLogin();
    const wallet = requireUnlockedMaestroWallet();
    const chainId = String(context.chain?.id || "");
    if (chainId !== MAINNET_CHAIN_ID)
      throw new Error("This wallet supports WAX mainnet only.");
    return {
      chain: Checksum256.from(MAINNET_CHAIN_ID),
      permissionLevel: PermissionLevel.from(
        `${wallet.account}@${wallet.permission}`,
      ),
    };
  }

  async sign(resolved, context) {
    const chainId = String(context.chain?.id || "");
    // WharfKit exposes two transaction views: `resolvedTransaction` has decoded
    // action data for human review, while `transaction` contains the ABI-encoded
    // bytes that must be hashed and signed. Never try to re-encode the review
    // view here because the wallet plugin does not own the action ABIs.
    const transaction = resolved.resolvedTransaction || resolved.transaction;
    const signingTransaction = resolved.transaction;
    if (chainId !== MAINNET_CHAIN_ID)
      throw new Error("Refusing to sign outside WAX mainnet.");
    if (
      !transaction ||
      !Array.isArray(transaction.actions) ||
      transaction.actions.length === 0
    ) {
      throw new Error("Refusing to sign an empty or invalid transaction.");
    }
    if (
      Array.isArray(transaction.context_free_actions) &&
      transaction.context_free_actions.length > 0
    ) {
      throw new Error("Maestro Wallet does not sign context-free actions.");
    }
    const actions = (transaction?.actions || []).map((action) => ({
      account: String(action.account),
      name: String(action.name),
      authorization: (action.authorization || []).map(
        (level) => `${level.actor}@${level.permission}`,
      ),
      data: displayActionData(action.data),
    }));
    const wallet = requireUnlockedMaestroWallet();
    const expectedAuthority = `${wallet.account}@${wallet.permission}`;
    if (String(context.permissionLevel || '') !== expectedAuthority) {
      throw new Error('The unlocked Maestro account does not match this session. Log in again.');
    }
    const policyInput = {
      scopes: wallet.autoSignScopes,
      actions,
      expectedAuthority,
      walletAccount: wallet.account,
    };
    const gameplayEligible = gameplayPolicyEligible({
      ...policyInput,
      gameplayActions: MAESTRO_GAMEPLAY_AUTO_SIGN_ACTIONS,
      companionActions: MAESTRO_COMPANION_AUTO_SIGN_ACTIONS,
    });
    const burnEligible = burnPolicyEligible(policyInput);
    const tokenPaymentEligible = tokenPaymentPolicyEligible(policyInput);
    const autoSignEligible =
      autoSignAllowedForPermission(wallet.permission) &&
      (gameplayEligible || burnEligible || tokenPaymentEligible);
    const reviewedDigest = getMaestroTransactionDigest(signingTransaction).toString();
    await context.ui?.onTransactComplete?.();
    if (!autoSignEligible) {
      await requestMaestroWalletSignature({ chainId, actions });
    }
    const signingDigest = getMaestroTransactionDigest(signingTransaction).toString();
    const currentWallet = requireUnlockedMaestroWallet();
    if (`${currentWallet.account}@${currentWallet.permission}` !== expectedAuthority) {
      throw new Error('Maestro account changed during approval. Review the transaction again.');
    }
    if (signingDigest !== reviewedDigest) {
      lockMaestroWallet();
      throw new Error(
        "Transaction changed after review. Wallet locked without signing.",
      );
    }
    updateGameTransaction({
      phase: "broadcasting",
      title: "Broadcasting transaction",
      message: "Signature created. Sending the transaction to WAX Mainnet…",
      actions: actions.map((action) => `${action.account}::${action.name}`),
    });
    return {
      signatures: [signMaestroTransaction(signingTransaction, chainId)],
    };
  }

  async logout() {
    lockMaestroWallet();
  }
}
