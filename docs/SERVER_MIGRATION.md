# Parallel mainnet hosting — 21 September 2026

The existing mainnet frontend now has an AWS-hosted preview at:
https://maestrobeatz.servegame.com/cleanupcentr/

GitHub Pages remains live at https://waxcleanup.github.io/. No redirects, announcements, DNS changes, GitHub pushes, contract deployments or API deployments were made. This is the current mainnet application, not a promotion of the testnet world/gameplay implementation.

## Storage and routing

- Host: existing AWS instance, ubuntu@3.14.81.74.
- Volume: /mntipfs (persistent ext4 mount, approximately 63 GiB available at inspection).
- Release directory: /mntipfs/cleanupcentr-mainnet/releases/<timestamp>.
- Atomic current symlink: /mntipfs/cleanupcentr-mainnet/current.
- Nginx web symlink: /var/www/cleanupcentr -> /mntipfs/cleanupcentr-mainnet/current.
- Deployment backups: /mntipfs/cleanupcentr-mainnet/backups/<timestamp>.
- Incoming deployment files: separate private incoming directory on that same volume.
- IPFS repositories and swapfile were not modified.
- Mainnet continues using the existing root API on port 3003; testnet keeps /cleanupcentr-testnet-api and port 3010.

Nginx adds only a dedicated mainnet snippet include. It serves SPA deep links, returns 404 for missing static files, blocks dotfiles, and applies CSP and no-index headers. HTML has matching noindex metadata. The URL is accessible to anyone who knows it; these settings discourage indexing and are not password protection.

## Repeatable deployment

From /home/maestrobeatz/waxprojects in WSL:

```sh
bash scripts/deploy-cleanupcentr-mainnet.sh
```

This uses the existing SSH credential without copying it into releases. The build runs locally, staging occurs on /mntipfs, and the installer validates the mount, mainnet manifest, volume headroom and Nginx configuration. It switches the current symlink atomically. Failed route/API health checks restore the previous release and Nginx configuration. Config backups and prior releases are retained.

The existing `npm run deploy` inside frontend/waxcleanup.github.io still builds and publishes GitHub Pages. It was not run during this migration. AWS builds go to build-server; GitHub builds still go to build.

## Mainnet boundary

The Maestro Wallet and WharfKit update is documented in [MAINNET_WALLET.md](MAINNET_WALLET.md).

- Existing WAX Mainnet chain ID and contracts are preserved.
- AWS wallet sessions use a mainnet-specific browser-storage namespace separate from testnet.
- Restored/new sessions must match the configured chain.
- A visible server-preview banner identifies mainnet and real-asset transactions.
- Server bundles omit source maps and the unused legacy frontend encryption value.

## Validation completed

- Four hosting checks passed, including the local mainnet configuration; server build and output validation passed.
- Mainnet homepage, shop, guide and protected-route deep links return the SPA.
- Public assets resolve; nonexistent assets return 404; dotfiles return 403.
- No-index response headers verified.
- SHA-256 checks confirm GitHub Pages, testnet frontend and both API health responses are unchanged.
- Browser navigation and public data loading checked without signing transactions.

## Before public launch

1. Complete owner-driven wallet login, session restoration and selected mainnet transaction checks; no financial transactions were signed during this migration.
2. Choose the final public domain if different, and verify wallet callback/origin settings there.
3. Plan indexing/canonical URL and announcement changes only when ready to launch.
4. Keep GitHub available as fallback during the agreed transition period; decide on redirects separately.
5. Monitor root-partition headroom: after the storage move below, / has about 945 MiB free (87% used). OS/service logs still use root.

## Local mainnet development

Run from /home/maestrobeatz/waxprojects in WSL:

```sh
bash scripts/start-cleanupcentr-mainnet.sh
```

Open http://localhost:3002/cleanupcentr/. Edits reload automatically. Testnet remains on port 3001. This runs locally without GitHub hosting, publishing, or a GitHub connection; the source folder still has its historical name, frontend/waxcleanup.github.io. Both AWS and GitHub builds use this same source to avoid divergent copies.

The local preview uses the same /cleanupcentr route base and mainnet wallet namespace as AWS, with a visible LOCAL PREVIEW label. Its development-only /mainnet-api proxy forwards to the existing mainnet backend without changing the server's CORS settings. The frontend is local; blockchain/API data remain live mainnet and wallet transactions use real assets. Wallet signing was not tested.

When ready, run the AWS deploy script above. Local edits do not deploy automatically. GitHub publishing remains a separate explicit command.

## Storage move completed

- /var/www/cleanupcentr-testnet now links to /mntipfs/cleanupcentr-testnet/current.
- /home/ubuntu/backups now links to /mntipfs/cleanupcentr-backups.
- 108 old deployment upload archives were moved from /tmp to a private timestamped directory under /mntipfs/cleanupcentr-staging-archive.
- Copies were checksum-verified before removing the duplicates from root. Backups and archives were retained, not discarded.
- Public mainnet/testnet homepage and API health response hashes matched before and after; Nginx configuration validated.
- Root free space increased from 110,874,624 to 989,892,608 bytes (about 840 MiB recovered).
- Testnet deployment now stages uploads and frontend releases on /mntipfs and removes successful incoming uploads. Its backend runtime stays at its existing path; no backend service was restarted for the move.
- IPFS data and OS logs were not changed. The mounted volume still has roughly 63 GiB available.

## Rollback

GitHub Pages stays available regardless of this preview. For later releases, point `current` atomically to a known-good directory under releases; no service restart is needed for static content. Each deployment's backups include its previous-release.txt and Nginx snapshot.

For this first parallel release, removing only the `include /etc/nginx/snippets/cleanupcentr-mainnet.conf;` line from the HTTPS site, validating with `sudo nginx -t`, and reloading Nginx disables the preview while preserving all existing routes. Do not restore a stale whole-site snapshot over unrelated later Nginx edits.

## Transition deployed — 29 September 2026

This dated update supersedes the preview-only status above. The AWS mainnet frontend is live at https://maestrobeatz.servegame.com/cleanupcentr/. The server-preview and brown mainnet warning strips have been removed. Mainnet release `20260929-134356` includes the current market, exchange, portfolio, farm rewards, burn receipt, farming and guide improvements.

GitHub Pages now serves the static `migration-site` landing page from `gh-pages`. Old application routes forward to their corresponding new-site routes. The full application source remains on `main`; do not replace it with the publishing branch or run the historical `npm run deploy` command, which would overwrite the migration page with the old hosting build.

The publishing tree includes `migration-site/.github/workflows/request-pages-build.yml` at `.github/workflows/request-pages-build.yml`. Keep that workflow when publishing with the repository deploy key. The pre-migration Pages snapshot is retained under `rollback/github-pages-before-move-20260929-204448`.

Search indexing is still disabled on the new host. Owner-driven wallet transaction acceptance and search-indexing promotion remain separate follow-up steps. Testnet was not changed by this transition deployment.