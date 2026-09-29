# Mainnet exchange

The `/exchange` page provides swaps, full-range liquidity deposits, per-pool positions, partial withdrawals, and fee collection through the existing Maestro/WharfKit session. It is public to browse; transactions require a connected WAX mainnet wallet and an explicit review.

## Token identities

| Symbol | Contract | Precision |
| --- | --- | --- |
| WAX | eosio.token | 8 |
| CINDER | cleanuptoken | 6 |
| TRASH | cleanuptoken | 3 |
| TOMATOE | maestrobeatz | 8 |
| BANANAZ | maestrobeatz | 8 |

These identities were checked against mainnet currency stats. TOMATOE and BANANAZ deliberately differ from the testnet configuration.

## Data and transactions

- Alcor's WAX API indexes pool IDs and supplies up to 200 recent trades for the chart. If the pool index fails, discovery falls back to paginated mainnet contract tables. Charts show trade prices, not complete candles or an invented APR.
- The selected pool, all ticks, balances and owned positions are read through a chain-verified WAX mainnet RPC. Table pagination must finish; uint64 values are parsed without losing integer precision.
- Alcor SDK 1.1.5 browser math modules compute concentrated-liquidity quotes locally. The Node/WASM route finder is excluded. No backend quote service or CSP relaxation is required.
- Amounts use BigInt decimal conversion. Each review binds the wallet, pool, input amount, token identities, operation and slippage. Quotes expire after 30 seconds. On-chain swap/deposit/withdrawal deadlines match the review expiry; a slow wallet approval can therefore require a fresh quote.
- Actions are serialized against live ABIs before dispatch. The pool and position ownership are checked again. The session dispatcher refuses a changed account or expired quote after restoring the wallet.
- Deposits submit both transfers and `addliquid` atomically. Withdrawals submit `subliquid` and `collect` atomically. Fee collection always uses the connected owner as recipient. The page does not sign automatically.
- New deposits use full-range ticks. Existing concentrated positions can be viewed, withdrawn or collected; custom range creation and multi-hop routing are outside this first version.

## Verification

`npm run test:exchange` exercises integer precision, token identity, pagination, both swap directions, stale reviews, deposit caps, partial withdrawals, ownership, account switching, and ABI serialization. The saved pool 5113 fixture and ABIs are public, read-only mainnet snapshots from September 21, 2026.

`CI=true npm test -- --watchAll=false --runInBand --runTestsByPath src/components/ExchangePage.test.jsx` checks the review flow, cancellation, stale input invalidation, wallet changes, insufficient balances and guest browsing with mocked wallet dispatch.

`npm run build:server` runs exchange and wallet checks before production compilation. Live testing only reads public data and opens wallet UI; no actual mainnet transfer is part of this verification.

Local URL: `http://localhost:3002/cleanupcentr/exchange`.
AWS preview: `https://maestrobeatz.servegame.com/cleanupcentr/exchange`.

## All my pools

`/exchange?view=positions` opens the account-wide Alcor portfolio. The account positions endpoint returns all positions for the connected owner, including non-game assets and closed positions. Results are grouped by pool and fee tier with token amounts, unclaimed fees, range/lock status, optional estimated USD values, and search/open/closed filters. Missing USD prices are marked unavailable and never silently treated as priced zero positions. Missing pool metadata does not hide a holding.

This overview uses Alcor's read-only account index and explicitly labels its values as estimates that may lag. Every row opens our own Manage liquidity panel; the external Alcor link is optional. Wallet changes clear the previous portfolio and discard late responses. Load errors show a retry state rather than an empty portfolio.

UI checks also include `src/components/AlcorPortfolio.test.jsx` for all-pool visibility, filtering, wallet switching, failure/retry, and local management links.

The overview uses compact position rows with pair/status, value and exact token amounts, and unclaimed fees. Sort by value, fee value, or newest position ID. Missing fee prices remain unavailable; APR and 24-hour fee statistics are not inferred. Both exchange token selectors include the connected wallet's exact available balance for every token, with explicit loading/unavailable labels instead of fabricated zeroes.

## Internal portfolio liquidity management

The row's Manage liquidity panel supports adding to the existing price range, removing 25/50/75/100%, and collecting fees. It includes paired-amount calculation, token balances, slippage, expiring amount review, and the existing wallet confirmation path. An out-of-range position can use a single-token deposit; zero-value token transfers are omitted. Locked positions cannot select removal in the UI, and the contract remains authoritative.

Non-game tokens are supported specifically for portfolio liquidity operations. Pool assets and precision are read from the chain-verified mainnet RPC and checked against each token's currency stats. This explicit per-operation token scope never changes the default swap allowlist. The owner, position ID, tick range, deposit amount, withdrawal percentage, balances, and quote expiry are checked again before ABI construction and wallet dispatch. Quotes or portfolio API metadata cannot introduce arbitrary token contracts into the transaction.

Tests include `PortfolioLiquidity.test.jsx`, non-game and single-sided liquidity math, and mocked mainnet RPC/ABI dispatch checks. No live assets are transferred by these tests.

References: [Alcor API v2](https://api.alcor.exchange/) and [AMM contract memo format](https://docs.alcor.exchange/developers-api/amm-swap-contract-api).
