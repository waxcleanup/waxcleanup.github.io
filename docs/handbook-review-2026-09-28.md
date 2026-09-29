# Handbook content review — 2026-09-28

Scope: encyclopedia and player guide. Reviewed application workflows and repository contract logic; this is not a deployed-contract bytecode audit.

Evidence:
- GET https://maestrobeatz.servegame.com/game/reference-data: three configured TOMATOE seeds, 14/21/28 waterings, 8h interval, 440,000/1,000,000/1,340,000 base yields. Guide reads this endpoint at runtime instead of duplicating numbers.
- contracts/rhythmfarmer/src/plots.hpp: planting consumes deposited seed and compost; first water immediate, later waters use growth_duration; watering/harvesting require equipped tool types; harvest accrues base_yield and resets slot.
- contracts/rhythmfarmer/src/farmcycle.hpp: cycle rewards use funded reward_pool and energy contributions, distinct from seed harvest.
- src/components/FarmDisplay.js: Global Farm, My Plots and Community Plots; management controls gated by manager.
- src/components/BagPanel.js, MachinesPage.js, RecipesPage.js: inventory deposit/open, machine deposit/start/claim, NFT/token requirements and randomized slots.
- src/components/ExchangePage.jsx and services/exchangeRoutes.js: direct/auto routing, maximum two pools, no split routes, expiring reviewed quote.
- src/components/MarketplacePage.jsx and ShopPage.js: WAX player listings vs official token-priced sales.

Corrections:
- Removed obsolete Your Farms setup instructions and Anchor-only wording.
- Removed unsupported generic farming NFT drops and yield-growth claims.
- Replaced hard-coded capacities, recharge rates and action-cost claims with the relevant live action controls.
- Explained deposited balances, separate energy stores, randomness callbacks and recovery via recent transactions.
- Added current canonical links for shop, marketplace, blends, exchange and liquidity; guide hash links open their sections.
- Categorization prioritizes explicit pack/cell schemas over names, correcting EcoTools Crate and Farm Cell.
- Removed developer-facing placeholder copy from encyclopedia pack entries.