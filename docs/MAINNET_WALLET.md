# Maestro Wallet and WharfKit mainnet port

The AWS mainnet frontend and local mainnet preview now include the Maestro Wallet flow from testnet. The testnet deployment and GitHub Pages deployment were not updated by this change.

Verified AWS release: `/mntipfs/cleanupcentr-mainnet/releases/20260921-143712` (21 September 2026). The live wallet chooser, Maestro handoff and cancellation were checked with no browser errors. Homepage/deep links and deployment assets passed HTTP checks; GitHub Pages, testnet and both API health responses retained their baseline hashes. Evidence is in `artifacts/mainnet-wallet-port/verification.json` at the workspace root.

## Included

- Maestro in the WharfKit wallet chooser alongside Anchor, Wombat, and Cloud Wallet, plus a direct Maestro button for setup.
- Encrypted browser-local vaults, account/permission discovery, multiple accounts, in-memory unlock, inactivity locking, account switching and wallet removal.
- Transaction review, optional scoped auto-sign preferences, activity history, progress messages and irreversible-block tracking.
- Verified mainnet RPC selection and failover. All three configured endpoints returned the mainnet chain ID and supported public account-authority lookup during validation.
- WharfKit ContractKit helper for ABI-backed action construction; existing mainnet gameplay action payloads remain unchanged.
- Local branding assets: the Maestro logo does not require GitHub.

Installed versions match the testnet installation: Session 1.7.0, Antelope 1.2.0, Contract 1.3.0, Anchor 1.7.3, Cloud Wallet 1.6.5, Wombat 1.5.1, Web Renderer 1.4.3. The login options use WharfKit's documented `walletPlugin` field: https://wharfkit.com/docs/session-kit/login.

## Mainnet behavior

The plugin accepts only WAX Mainnet chain ID `1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4`. Mainnet vaults, consent, activity, preferences and wallet-plugin IDs have separate names from testnet; there is no automatic testnet-vault migration. Namespacing prevents accidental reuse but is not an origin security boundary: the AWS mainnet and testnet paths share a browser origin.

Vault encryption retains testnet's PBKDF2-SHA-256 (600,000 iterations) and AES-256-GCM with authenticated account/permission/chain metadata. The imported public key must independently meet the permission threshold. Keys and passwords are not sent to the RPC; authority lookup uses the public key. Signing is local.

The port also checks that the unlocked wallet matches the signing session, rejects changed transaction bytes after review, rejects pending signatures when locked, and clears the displayed session when the wallet locks or changes accounts. Auto-sign stays disabled for owner permissions. Token payment limits use exact decimal arithmetic and apply across all actions in one transaction.

Localhost and AWS are different origins, so importing a wallet locally does not install it on AWS. Refresh locks the vault. Local and AWS mainnet interactions use real assets.

## Validation

`npm run test:wallet-security` runs 14 offline checks: policy bounds, vault encryption, wrong-password rejection, authenticated metadata, chain isolation, permission threshold enforcement, local signature recovery, transaction mutation rejection, account mismatch, pending-approval cancellation, and mainnet-only RPC failover.

`npm run test:hosting` runs four hosting/session checks. `npm run build:server` runs the wallet checks before producing and validating the server bundle. Existing unrelated lint warnings remain.

Browser checks cover wallet choices, the Maestro login handoff, the mainnet setup form, cancellation, and public-page navigation. No real private key was imported, no terms were accepted on a user's behalf, and no mainnet transaction was broadcast. Unit signing uses disposable generated keys and mocked RPC responses.

## Working and deploying

From the workspace in WSL, `bash scripts/start-cleanupcentr-mainnet.sh` runs the local preview at http://localhost:3002/cleanupcentr/. `bash scripts/deploy-cleanupcentr-mainnet.sh` builds, tests, and deploys the mainnet frontend to AWS. GitHub publishing is a separate command. Neither script changes blockchain contracts.
