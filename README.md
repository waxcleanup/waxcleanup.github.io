# CleanupCentr Frontend

CleanupCentr is a WAX blockchain game and ecosystem focused on restoration, recycling, farming, machines, packs, blends, and on-chain utility NFTs. This frontend powers the main user experience for interacting with the CleanupCentr platform.

## Features

- **Shop** for purchasing project items
- **Blends** for opening crates and combining resources into new assets
- **Burn** system for recycling NFTs
- **Farming** gameplay with plots, seeds, compost, and harvesting
- **Machines** for resource processing and future automation
- **Guide** for helping users understand the ecosystem
- **Encyclopedia** for browsing project assets and collections
- Wallet integration through **Anchor / WAX session login**
- Music player integration for supported NFT audio content

## Current Gameplay Systems

### Blends
Users can:
- open crates
- combine NFTs and tokens
- receive loot-based outputs
- execute blend recipes directly from the frontend

### Farming
Users can:
- manage plots
- plant seeds
- water and harvest crops
- use compost and tools
- interact with farm-based energy systems

### Machines
Users can:
- interact with project machines
- process resources
- participate in future manufacturing-style gameplay loops

## Tech Stack

- **React**
- **Create React App**
- **React Router**
- **WAX / Anchor wallet session integration**
- **AtomicAssets**
- Custom backend APIs for:
  - blend data
  - bag assets
  - machine data
  - shop data
  - farming data
  - collection metadata

## Project Structure

```bash
src/
  components/
  hooks/
  services/
  assets/