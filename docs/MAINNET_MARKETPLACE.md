# Mainnet NFT marketplace

Route: `/cleanupcentr/marketplace` (local: localhost:3002). The Shop remains the primary game shop; this page is the secondary NFT market for the `cleanupcentr` AtomicAssets collection.

Browse uses mainnet AtomicMarket listings, with server-side name search, schema categories, price sorting and 24-item pagination. My listings queries the connected seller independently. Sell queries wallet-held AtomicAssets NFTs; staked NFTs need unstaking first. API fallback: wax.api.atomicassets.io, then atomic-api.wax.cryptolions.io.

The first release supports single-NFT sales priced directly in `8,WAX` from `eosio.token`. Bundles and USD/oracle pricing are explicitly unavailable. Listings made on other AtomicMarket frontends appear here too. NFTs use existing metadata/IPFS images.

## Mainnet transaction behavior

Live ABI/config verified September 21, 2026. Mainnet AtomicAssets listings use offers, not an NFT escrow transfer. CleanupCentr is registered on mainnet with marketplace_name and creator both `cleanupcentr`. Registration transaction: `fb2e494b60d76db3f4b998546b8e6ecb2f6c465013ef7a7b23862d9277b2f7fd` (block 457101302). Maker/taker attribution uses `cleanupcentr` after verifying the registration and recipient on-chain before each operation. Existing sale maker attribution remains as originally listed. No account permissions were changed.

- List: announcesale + AtomicAssets createoffer, atomically.
- Buy: assertsale + eosio.token transfer (`deposit`) + purchasesale, atomically.
- Cancel: cancelsale, after checking connected seller against the live sale.

Every operation requires a separate review then Confirm in wallet. Preflight checks live mainnet configuration, exact NFT/collection/owner, transferability, sale/offer terms and buyer balance as applicable. Execution repeats checks, compares reviewed actions and fees, validates action payloads with the live ABI, and binds actor/120-second review expiry to InitTransaction. Purchases assert exact asset and WAX price on-chain before paying. BigInt amounts retain all eight WAX decimals.

Fees are read from the mainnet configuration; existing sales use their stored collection royalty. The current collection/maker/taker rates are 6% / 1% / 1%. API indexing can lag successful transactions; confirmation includes the transaction ID and Refresh guidance. No trading transactions were broadcast during development.

## Verification

`npm run test:marketplace`: exact arithmetic, mainnet ABI serialization, atomic action order, sale/offer/owner/transferability/collection/token/fee validation, insufficient balance, expiry, wallet mismatch, and seller pagination. Included in build:server's gates.

`CI=true npm test -- --watchAll=false --runInBand --runTestsByPath src/components/MarketplacePage.test.jsx`: review/confirm separation, closing, login, seller cancellation, exact listing input, double-submit blocking, wallet switches, search/pagination/race handling and errors.

Public live endpoints and browser rendering are checked read-only. Wallet dispatch is mocked in financial tests.

## Seller pricing suggestions

The listing dialog queries the same collection and exact template for the lowest active listing (state 1, price ascending) and most recent completed sale (state 3, updated descending). Both queries restrict to single-NFT WAX sales and validate the response token contract, precision, state, template, collection, and bundle size before enabling autofill. Suggestions retain exact eight-decimal amounts and never overwrite typed input automatically. Last-sale time is displayed; errors and missing history leave manual pricing available. Each side can succeed independently. Autofill and refresh are disabled during review/signing.


### Confirmed listing refresh (23 September 2026)

After a successful listing transaction the page refreshes immediately and checks AtomicMarket for that asset up to 20 times, three seconds between completed checks. The NFT cannot be listed again while the confirmed sale is awaiting indexing. Once found, inventory and listings refresh again and show Manage listing. Delayed/erroring indexes receive a clear message; Refresh restarts the check. Checks stop on unmount or wallet change. Verified with a mocked delayed-index UI regression; no real NFT transactions submitted during testing.
