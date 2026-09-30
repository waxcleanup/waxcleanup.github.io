import React, {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import axios from 'axios';
import TokenLogo from './TokenLogo';
import './GuidePage.css';

const topics=[['quick-start','Start here'],['farming-start','Farming'],['onchain-farming','Seed reference'],['energy-system','Energy'],['burn-center','Burning'],['blends','Packs & blends'],['markets','Shop & marketplace'],['exchange','Exchange'],['machines','Machines'],['troubleshooting','Help']];
function Section({id,title,children}) {
  const index=topics.findIndex(t=>t[0]===id); const next=topics[index+1];
  const [open,setOpen]=useState(id==='quick-start' || window.location.hash==='#'+id);
  useEffect(()=>{
    const reveal=()=>{if(window.location.hash==='#'+id){setOpen(true); requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({block:'start'}));}};
    reveal(); window.addEventListener('hashchange',reveal); return()=>window.removeEventListener('hashchange',reveal);
  },[id]);
  return <details id={id} className="guide-section" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary className="guide-section-summary"><span className="guide-section-number" aria-hidden="true">{String(index+1).padStart(2,"0")}</span><h2>{title.replace(/^\d+ \/ /,"")}</h2><span className="guide-expand">{open?'−':'+'}</span></summary><div className="guide-content">{children}<div className="guide-reading-footer"><a className="guide-section-link" href={'#'+id}>Share this section ↗</a>{next && <a className="guide-next" href={'#'+next[0]}>Next: {next[1]} →</a>}</div></div></details>;
}
function Routes({items}){return <div className="guide-link-row">{items.map(([to,label])=><Link className="guide-link-button" key={to} to={to}>{label} →</Link>)}</div>}
function Card({title,children}){return <article className="guide-card"><h3>{title}</h3><p>{children}</p></article>}
function SeedReference(){
 const [data,setData]=useState(null),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;axios.get((process.env.REACT_APP_API_BASE_URL||'https://maestrobeatz.servegame.com')+'/game/reference-data').then(r=>{if(active){if(!r.data?.success || !Array.isArray(r.data.seeds))throw Error('Missing reference');setData(r.data.seeds);}}).catch(()=>{if(active)setFailed(true)});return()=>{active=false}},[]);
 return <>{failed?<p role="status">Seed data is unavailable. Check the seed details in Farming before planting.</p>:!data?<p role="status">Loading current seed configuration…</p>:<div className="guide-table-wrap"><table className="guide-data-table"><thead><tr><th>Seed</th><th>Waterings</th><th>Between waterings</th><th>Base reward per harvest</th></tr></thead><tbody>{data.map(seed=><tr key={seed.template_id}><td>{seed.seed_name}</td><td>{seed.water_ticks}</td><td>{seed.growth_duration_display}</td><td><TokenLogo symbol={seed.token_symbol_code} size={16}/>{seed.base_yield_display} {seed.token_symbol_code}</td></tr>)}</tbody></table></div>}<p className="guide-note">Loaded from the game’s current reference data. Configuration can change. The interval is the wait between waterings, not the total growing time.</p></>;
}
export default function GuidePage(){
 return <main className="guide-page">
 <header className="guide-hero"><span className="guide-kicker">PLAYER HANDBOOK · WAX MAINNET</span><h1>Your path to a growing farm.</h1><p>Learn the farming loop, understand what you are buying, and move between the game’s markets with confidence.</p><Routes items={ [['/collections','Browse encyclopedia'],['/market/shop','Shop'],['/market/listings','Player marketplace'],['/exchange','Exchange']]}/></header>
 <div className="guide-layout"><nav className="guide-toc" aria-label="Guide contents"><span className="guide-nav-label">YOUR GUIDE</span>{topics.map(([id,label],index)=><a href={'#'+id} key={id}><span>{String(index+1).padStart(2,"0")}</span>{label}</a>)}</nav><div className="guide-chapters">
 <Section id="quick-start" title="01 / Start with a working setup">
 <p>Choose the activity you want to play before buying assets. A crate is not necessarily a complete farming kit; inspect its contents and the requirements for your next action.</p>
 <ol className="guide-start-list"><li><strong>Connect your WAX wallet.</strong> Confirm the account and network. The resource bar shows balances, CPU, RAM and personal energy. Transactions need sufficient network resources.</li><li><strong>Prepare the assets.</strong> For farming, start with a Plot, seed balance, deposited compost, and watering and harvesting tools. Check the Global Farm is available.</li><li><strong>Stake and equip.</strong> Stake your Plot into the Global Farm. Use Farm Inventory to deposit seeds or seed packs and compost. Deposit tools, then equip them in Farm Loadout.</li><li><strong>Complete the loop.</strong> Plant, water when eligible, harvest when Ready, then claim pending rewards. Keep both personal and farm energy available.</li></ol>
 <Routes items={ [['/farming','Open farming'],['/market/shop','Find supplies'],['/market/blends','Explore blends']]}/>
 </Section>
 <Section id="farming-start" title="02 / Farming: prepare, grow, claim">
 <div className="guide-grid"><Card title="Your Plot, shared farm">The current Farming page uses one Global Farm with individually owned plots. My Plots shows your own plots; Community Plots lets you browse the shared farm. You do not need to buy your own Farm NFT to use this flow.</Card><Card title="Seed and compost balances">Owning an NFT in your wallet is different from having deposited game resources. Use Farm Inventory to prepare seeds and compost, then check their balances before planting. Planting consumes one seed and the required compost.</Card><Card title="Equipped tools">Watering requires an equipped watering tool, such as EcoSpout. Harvesting requires an equipped harvesting tool, such as EcoScythe. Holding a tool in your wallet or staking it alone does not equip it.</Card></div>
 <ol><li>Choose an empty slot on a Plot you own and plant a deposited seed.</li><li>The first watering is available immediately. Later waterings require the seed’s configured cooldown.</li><li>Water All targets eligible growing slots; it skips cooling-down slots. You still need enough energy for the actions in the transaction.</li><li>After the required watering count, the crop becomes Ready. Harvest credits the configured seed reward and clears the slot.</li><li>Use Claim beside Pending Rewards to transfer accrued rewards to your wallet.</li></ol>
 <p>For this plot-and-seed flow, harvesting credits the seed’s configured base reward. Tools enable watering and harvesting; the guide does not promise extra NFT drops or weather-based multipliers for this flow. Farm-cycle rewards are separate and depend on the farm’s funded reward pool and configuration.</p>
 <Routes items={ [['/farming','Tend your plots'],['/collections','Compare seeds & tools']]}/>
 </Section>
 <Section id="onchain-farming" title="03 / Current seed reference"><SeedReference/><p>The first watering has no wait. With prompt watering, the earliest completion is approximately (required waterings − 1) × the cooldown. Delayed watering extends that time. Base token rewards are game quantities, not guaranteed USD values.</p></Section>
 <Section id="energy-system" title="04 / Energy & recharge">
 <div className="guide-grid"><Card title="Personal energy">Your account’s energy pays for supported farming and machine actions. Personal energy cells increase capacity. Check the recharge dialog for the current CINDER cost and available capacity.</Card><Card title="Farm energy">The Global Farm has a separate energy supply. Personal recharge does not refill it. Farm management controls are available to the farm’s manager; a low farm battery can block your farming action.</Card><Card title="Incinerator energy">Each Incinerator tracks its own energy, TRASH fuel and durability. Refilling your personal energy does not refill an Incinerator.</Card></div>
 <p>Use the cost shown by the relevant action or recharge dialog. Energy rates, action costs and capacities are configured per system and can change. A full cell cannot accept an over-capacity recharge.</p>
 <Routes items={ [['/farming','Personal energy'],['/exchange','Get CINDER'],['/burn','Incinerators']]}/>
 </Section>
 <Section id="burn-center" title="05 / Burning approved NFTs">
 <p>Burning permanently consumes the selected NFT. Only NFTs matching an approved burn rule are eligible. Review the selected item’s fuel cost and CINDER reward before approving.</p>
 <ol><li>Assign an Incinerator to the Burn Console slot holding the NFT.</li><li>Check its TRASH fuel, internal energy, durability and repair status.</li><li>Review the burn and approve the transaction in your connected wallet.</li></ol>
 <p>Use the Burn Center’s approved collection and rule information to check eligibility. A marketplace listing or collection name alone does not mean an NFT is burnable for rewards.</p>
 <Routes items={ [['/burn','Open Burn Center'],['/exchange','Swap for fuel'],['/market/listings','Browse player listings']]}/>
 </Section>
 <Section id="blends" title="06 / Packs, blends & reveals">
 <p>Open a supported pack from Farm Inventory or its recipe in Blends. A seed pack may credit a configured seed balance; a crate recipe may mint NFTs. Check the item’s opening method and requirements.</p>
 <div className="guide-grid"><Card title="Read the drop slots">Every configured slot is included. A fixed slot has one outcome; a randomized slot selects one outcome from its listed possibilities. A zero-NFT outcome contributes no NFT. The total range shows the possible NFT count, not a promise of every pictured item.</Card><Card title="Check what you need">Blend details show required NFTs, required tokens, owned balances and missing amounts. Inputs marked as consumed are used up when the blend completes. Follow the specific recipe rather than assuming all blends work the same way.</Card><Card title="Recover a reveal">Randomized openings can finish in a later transaction than the original transfer. Use Recent transactions and View reveal to return to the result. Find an older transaction accepts the full opening transaction ID. Checking a reveal does not submit another opening.</Card></div>
 <p>If your wallet says the transaction was accepted but the reveal is pending, let it finish or check the transaction link. Do not repeat a successful opening to retrieve its results.</p>
 <Routes items={ [['/market/blends','Open blends & history'],['/market/shop','Inspect pack contents'],['/farming','Open inventory']]}/>
 </Section>
 <Section id="markets" title="07 / Shop & player marketplace">
 <div className="guide-grid"><Card title="Shop · official items">Buy official packs and game items at the listed token price. View item shows quantity limits, supply, total cost and available content details. USD prices are estimates; payment uses the displayed token.</Card><Card title="Player marketplace · NFT listings">Browse player listings or manage eligible NFTs you own. Review the NFT, seller, WAX price and fees before purchase or listing. Listing an NFT does not guarantee a buyer. Compare items by template and attributes.</Card><Card title="Blends · recipe outputs">Use assets you already hold to satisfy a recipe. Blends are part of the Market, but follow recipe requirements rather than a player’s listing price.</Card></div>
 <Routes items={ [['/market/shop','Official shop'],['/market/listings','Player marketplace'],['/market/blends','Blends']]}/>
 </Section>
 <Section id="exchange" title="08 / Exchange tokens">
 <p>The Exchange swaps supported tokens on WAX mainnet using Alcor pools: WAX, CINDER, TRASH, TOMATOE, BANANAZ and WAXUSDC. Match the symbol and contract, not just the logo.</p>
 <ol><li>Select From and To assets, enter the amount, and choose your slippage tolerance.</li><li>Use a selected direct pool, or choose Auto route to compare supported paths through up to three pools. Auto route picks the best successfully quoted path; it does not split one swap across multiple paths.</li><li>Check estimated receive, minimum received, pool fees and price impact. Quotes expire. USD estimates are indicative and are not the amount the contract settles.</li><li>Select Review swap. Check the route, account and amounts, then confirm in your wallet only if they match your intent.</li></ol>
 <p><TokenLogo symbol="WAXUSDC"/>WAXUSDC on this site is issued through <strong>eth.token</strong> on WAX. Swapping here does not bridge funds to Solana or another chain.</p>
 <p>Liquidity is a separate Exchange tab. Deposits and withdrawals have their own review; providing liquidity exposes your position to changes in relative token prices and can return different token amounts.</p>
 <Routes items={ [['/exchange','Open exchange'],['/exchange?view=positions','Your liquidity']]}/>
 </Section>
 <Section id="machines" title="09 / Machine production">
 <ol><li>Stake an eligible machine and select a supported recipe.</li><li>Review the input balances, energy requirement, processing time and possible outputs.</li><li>Deposit the required inputs, then start processing.</li><li>When the machine is ready, claim its output. Randomized results can require a later reveal.</li></ol>
 <p>Each recipe defines its inputs and outputs. Check the machine’s current state before depositing again or starting another run.</p><Routes items={ [['/machines','Open machines'],['/market/listings','Find equipment']]}/>
 </Section>
 <Section id="troubleshooting" title="10 / When something does not work">
 <div className="guide-grid"><Card title="Cannot plant">Check plot ownership, an empty slot, deposited seed and compost balances, and personal and farm energy.</Card><Card title="Cannot water or harvest">Check the equipped tool type, cooldown or Ready state, and energy. The displayed countdown applies to that crop’s current watering cycle.</Card><Card title="Accepted transaction, missing result">Inspect its transaction link and Recent transactions before retrying. Indexing or randomness can complete later. Refresh balances or reopen the reveal.</Card><Card title="Swap quote unavailable">Try refreshing, a smaller amount, another direct pool or Auto route. Some paths have no usable liquidity. An expired quote must be refreshed before signing.</Card><Card title="Wallet or resource error">Check the connected account, selected wallet, CPU and RAM. Read the actual contract error; a rejected request has not completed the intended action.</Card></div>
 </Section>
 </div></div><footer className="guide-note">Guide reviewed September 28, 2026 using current game data and workflows. Live action requirements remain authoritative. Share a topic using its section link.</footer>
 </main>;
}
