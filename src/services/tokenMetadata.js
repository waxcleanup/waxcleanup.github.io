import wax from '../assets/tokens/wax_eosio.token.png';
import cinder from '../assets/tokens/cinder_cleanuptoken.png';
import trash from '../assets/tokens/trash_cleanuptoken.png';
import tomatoe from '../assets/tokens/tomatoe_maestrobeatz.png';
import bananaz from '../assets/tokens/bananaz_maestrobeatz.png';
import waxusdc from '../assets/tokens/waxusdc_eth.token.png';
import {identity} from './exchangeMath';

// Match the complete on-chain identity; symbols alone are not unique.
const metadata = {
  'WAX@eosio.token:8': {logo:wax,role:'Network token',description:'WAX is the native token of the WAX blockchain. Use it to trade for CleanupCentr resources and manage network resources for your account.'},
  'CINDER@cleanuptoken:6': {logo:cinder,role:'Burn rewards & energy',description:'Turn NFT cleanup into your next action. Earn CINDER by burning approved NFTs through Incinerators, then spend it to recharge personal and farm energy.'},
  'TRASH@cleanuptoken:3': {logo:trash,role:'Incinerator fuel',description:'Keep the cleanup running. TRASH fuels Incinerators in the Burn Center, supporting the process that burns approved NFTs and produces CINDER.'},
  'TOMATOE@maestrobeatz:8': {logo:tomatoe,role:'Harvests & farm supplies',description:'Put your harvest back to work. TOMATOE is a farming resource earned from configured crop rewards and used for eligible shop items and blend recipes.'},
  'BANANAZ@maestrobeatz:8': {logo:bananaz,role:'Blend ingredient',description:'Build your next farming supply. BANANAZ is used in supported blend recipes, including EcoFusion Compost, alongside the recipe’s other required tokens and NFTs.'},
  'WAXUSDC@eth.token:6': {logo:waxusdc,role:'USDC-linked token on WAX',description:'WAXUSDC is the USDC-linked token traded on WAX through eth.token. Swap it against supported assets on Alcor. Bridging to another chain is a separate step; this Exchange swaps on WAX.'},
};
export const tokenMetadata = token => metadata[identity(token)] || null;
