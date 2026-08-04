// src/components/GuidePage.js
import React from 'react';
import { Link } from 'react-router-dom';
import './GuidePage.css';

function Section({ id, title, children, defaultOpen = false }) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <details
      id={id}
      className="guide-section"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="guide-section-summary">
        <h3>{title}</h3>
        <span className="guide-section-toggle">{open ? 'Hide' : 'Show'}</span>
      </summary>
      <div className="guide-content">{children}</div>
    </details>
  );
}

function Card({ title, children }) {
  return (
    <div className="guide-card">
      <h4>{title}</h4>
      <p>{children}</p>
    </div>
  );
}

function Step({ number, title, children }) {
  return (
    <div className="guide-step">
      <div className="guide-step-number">{number}</div>
      <div className="guide-step-body">
        <h4>{title}</h4>
        <p>{children}</p>
      </div>
    </div>
  );
}

function GuideRouteLink({ to, children }) {
  return (
    <Link className="guide-link-button" to={to}>
      {children}
    </Link>
  );
}

export default function GuidePage() {
  return (
    <div className="guide-page">
      <div className="guide-hero">
        <h2>CleanupCentr Guide</h2>
        <p>
          CleanupCentr is a production and utility game built around NFTs,
          burning, energy, farming, machines, and progression. The goal is not
          just to collect assets, but to put them to work inside a connected
          economy.
        </p>
      </div>

      <nav className="guide-toc" aria-label="Guide contents">
        <strong>Jump to:</strong>
        <a href="#quick-start">Quick Start</a>
        <a href="#farming-start">Start Farming</a>
        <a href="#onchain-farming">On-Chain Rules</a>
        <a href="#burn-center">Burning</a>
        <a href="#energy-system">Energy</a>
        <a href="#machines">Machines</a>
        <a href="#blends">Blends</a>
        <a href="#troubleshooting">Troubleshooting</a>
      </nav>

      <Section id="quick-start" title="🚀 New Player Quick Start" defaultOpen>
        <div className="guide-highlight">
          Follow these steps in order to complete your first farming loop. You
          will approve WAX transactions in Anchor whenever an NFT or token moves
          into the game contract.
        </div>

        <Step number="1" title="Connect Anchor and Check WAX Resources">
          Connect your WAX account. The resource bar shows your account, liquid
          WAX, RAM, CPU, game tokens, and personal energy. WAX pays network
          resource costs; keep enough CPU and RAM available to sign actions.
        </Step>

        <Step number="2" title="Get a Farming or Starter Pack">
          Open the Shop, compare the guaranteed and possible drops, check that
          your token balance covers the selected quantity, and purchase the pack.
        </Step>

        <Step number="3" title="Open the Pack in Your Farming Bag">
          Go to Farming, expand Bag → Packs, and open the pack. Loot is
          randomized and may take several seconds to appear after the Anchor
          transaction is confirmed.
        </Step>

        <Step number="4" title="Prepare Farming Assets">
          You need a Plot, at least one seed, compost, personal energy, farm
          energy, an equipped Watering tool, and an equipped Harvesting tool.
          You may use an available global farm or stake your own Farm NFT.
        </Step>

        <Step number="5" title="Stake and Equip">
          Stake the Plot into a farm. Deposit each tool from Bag → Tools, then
          equip it from Staked Tools into its matching Watering or Harvesting
          slot. Deposit compost from Bag → Compost.
        </Step>

        <Step number="6" title="Plant, Water, and Harvest">
          Plant one seed, water immediately for the first tick, return when the
          seed cooldown expires, and use Water All for every eligible slot.
          Harvest after all required watering ticks are complete, then claim
          accrued rewards from the Farming page.
        </Step>

        <div className="guide-link-row guide-link-grid">
          <GuideRouteLink to="/shop">Open Shop</GuideRouteLink>
          <GuideRouteLink to="/farming">Open Farming</GuideRouteLink>
          <GuideRouteLink to="/collections">Open Encyclopedia</GuideRouteLink>
        </div>
      </Section>

      <Section title="🌍 What is CleanupCentr?">
        <p>
          CleanupCentr is designed around the idea that every asset should have a
          purpose. Some NFTs are meant to be burned. Some are meant to be used in
          farming. Some are tools. Some are machines. Some are progression items
          that help players scale from basic actions into larger production
          systems.
        </p>

        <p>
          Instead of every NFT being treated like a static collectible,
          CleanupCentr turns assets into working parts of a larger game loop.
          Supply destruction, resource generation, energy consumption, and
          production growth all connect together.
        </p>
      </Section>

      <Section title="🔁 Core Gameplay Loop">
        <div className="guide-grid">
          <Card title="Acquire Assets">
            Get packs, utility NFTs, fuel, tools, machines, or burn assets from
            the shop or marketplace.
          </Card>

          <Card title="Use the Systems">
            Put those assets to work in the Burn Center, Farming, Blends, and
            Machines.
          </Card>

          <Card title="Generate Resources">
            Create useful outputs like CINDER, energy access, farming inputs, and
            progression materials.
          </Card>

          <Card title="Reinvest and Expand">
            Use what you produce to scale your operation with more plots, tools,
            stronger machines, and better infrastructure.
          </Card>
        </div>
      </Section>

      <Section id="farming-start" title="🌾 What You Need to Start Farming">
        <p>
          A Farming Pack is a convenient way to begin collecting farming items,
          but opening one does not automatically create a working farm. Pack
          contents can vary, so use <strong>View Drops</strong> in the Shop to
          see its guaranteed and possible rewards before buying.
        </p>

        <div className="guide-highlight">
          <strong>Minimum farming path:</strong> connect your wallet, open your
          pack, prepare a Plot and seeds, make sure you have energy, then stake
          and equip the tools required to water and harvest.
        </div>

        <div className="guide-grid">
          <Card title="Farming Pack">
            Buy a farming or starter pack from the Shop, then open it from
            Farming → Bag → Packs. The contents may provide seeds, compost,
            tools, plots, or other farming resources depending on its drop table.
          </Card>

          <Card title="A Plot">
            A Plot provides planting slots. Stake your Plot from Farming → Bag →
            Plots and select an available global farm or one of your own farms.
          </Card>

          <Card title="Seeds">
            Seeds are required to plant a crop. Open seed packs when needed and
            check the Seeds group in your Bag before trying to plant.
          </Card>

          <Card title="Energy">
            Farming actions consume energy. Energy cells increase your personal
            capacity, and CINDER is used to recharge personal or farm energy.
          </Card>

          <Card title="Farming Tools">
            The loadout has separate Watering and Harvesting tool slots. Tools
            must first be staked from your Bag and then equipped in the matching
            slot before they can support the farming cycle.
          </Card>

          <Card title="Compost">
            Compost is a farming input used by supported planting, recipe, and
            progression systems. Deposit compost from the Compost group in your
            Farming Bag when the activity requires it.
          </Card>
        </div>

        <div className="guide-subsection">
          <h4>Do I need to own a Farm NFT?</h4>
          <p>
            Not always. You can stake a Plot into an available global farm. If
            you own a Farm NFT, stake it under <strong>Your Farms</strong>. A
            farm battery and farm energy help support your own farm
            infrastructure, but they are separate from the Plot, seeds, and
            personal tool loadout.
          </p>
        </div>

        <div className="guide-subsection">
          <h4>Farming Tool Setup</h4>
          <Step number="1" title="Find the Tool in Your Bag">
            Open Farming, expand the Tools group in the Bag, and confirm whether
            it is a Watering or Harvesting tool.
          </Step>

          <Step number="2" title="Stake the Tool">
            Select the tool’s stake action and approve the Anchor transaction.
            After indexing completes, it appears in the Staked Tools section.
          </Step>

          <Step number="3" title="Equip the Correct Slot">
            Equip watering tools in the Watering slot and harvesting tools in
            the Harvesting slot. A tool in the wrong slot cannot replace the
            tool required by the action.
          </Step>

          <Step number="4" title="Check Energy and Begin">
            Confirm that your personal energy is available, plant a seed in your
            Plot, use Water or Water All when a slot is ready, and harvest after
            the crop reaches its goal.
          </Step>
        </div>

        <div className="guide-highlight">
          <strong>Before planting, check:</strong> Plot staked, seed available,
          required compost deposited, personal energy charged, Watering tool
          equipped, and Harvesting tool equipped.
        </div>
      </Section>

      <Section id="onchain-farming" title="⛓️ Current On-Chain Farming Rules">
        <p>
          These values come from the live <strong>rhythmfarmer</strong> contract
          configuration on WAX. They are current settings, not permanent
          promises: contract administrators can update configured templates,
          capacities, ratios, and seed metadata.
        </p>

        <div className="guide-grid">
          <Card title="Plant Cost">
            Planting consumes 1 seed, 1 deposited compost, 2 personal energy,
            and 1 energy from the farm currently hosting the Plot.
          </Card>

          <Card title="Water Cost">
            Each successful watering consumes 2 personal energy and 1 farm
            energy. An equipped watering tool is mandatory.
          </Card>

          <Card title="Harvest Cost">
            Harvesting consumes 2 personal energy and 1 farm energy. The crop
            must be READY and an equipped harvesting tool is mandatory.
          </Card>

          <Card title="Energy Recharge">
            The live rate is 1.000000 CINDER for 2 energy. Recharge cannot exceed
            the remaining capacity of the personal cell or farm battery.
          </Card>

          <Card title="Current Plot">
            The configured Common Plot template currently provides 1 planting
            slot. Plot capacity is controlled by on-chain template metadata.
          </Card>

          <Card title="Current Cells">
            The configured Simple Core adds 250 personal energy capacity. The
            configured Farm Cell adds 90,000 farm energy capacity.
          </Card>
        </div>

        <div className="guide-subsection">
          <h4>Current Seed Timing and Base Yield</h4>
          <div className="guide-table-wrap">
            <table className="guide-data-table">
              <thead>
                <tr>
                  <th>Seed</th>
                  <th>Waters</th>
                  <th>Cooldown</th>
                  <th>Minimum Time</th>
                  <th>Base Yield</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Basic Tomato Seed</td>
                  <td>14</td>
                  <td>8 hours</td>
                  <td>About 4 days 8 hours</td>
                  <td>440,000 TOMATOE</td>
                </tr>
                <tr>
                  <td>Tomato E Seed</td>
                  <td>21</td>
                  <td>8 hours</td>
                  <td>About 6 days 16 hours</td>
                  <td>1,000,000 TOMATOE</td>
                </tr>
                <tr>
                  <td>Enhanced Tomato Seed</td>
                  <td>28</td>
                  <td>8 hours</td>
                  <td>About 9 days</td>
                  <td>1,340,000 TOMATOE</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="guide-note">
            The first watering is allowed immediately after planting. The
            minimum times above count the remaining 8-hour intervals and assume
            every watering happens as soon as it becomes available.
          </p>
        </div>

        <div className="guide-highlight">
          <strong>Water All:</strong> only growing slots that are ready are sent
          to the contract. Ineligible or cooling-down slots are skipped. Make
          sure enough personal and farm energy exists for every target because
          an energy failure rejects the transaction.
        </div>
      </Section>

      <Section id="burn-center" title="🔥 Burn Center">
        <p>
          The Burn Center is one of the most important systems in CleanupCentr.
          It is where players use <strong>Incinerators</strong> to burn supported
          NFTs and turn destruction into useful ecosystem value.
        </p>

        <p>
          The Burn Center is not just a disposal mechanic. It is one of the main
          engines of the game economy. Burning reduces supply, creates demand for
          utility assets, and helps feed the systems that power long-term
          progression.
        </p>

        <div className="guide-highlight">
          <strong>Core burn loop:</strong> TRASH fuels Incinerators, Incinerators
          create CINDER, and CINDER is used to buy energy that powers both
          Incinerators and farm energy systems.
        </div>

        <div className="guide-subsection">
          <h4>Before You Burn</h4>
          <ul className="guide-checklist">
            <li>The NFT must match an approved template or schema burn rule.</li>
            <li>An Incinerator must be assigned to the same Burn Console slot.</li>
            <li>The Incinerator must have enough TRASH fuel.</li>
            <li>The Incinerator must have enough internal energy.</li>
            <li>Durability must be greater than zero.</li>
            <li>The Incinerator cannot have an active repair timer.</li>
          </ul>
          <p>
            The Burn button uses the same validation immediately before the
            wallet transaction. If the NFT does not include custom economics,
            the current frontend fallback is 10,000 TRASH fuel and 1
            Incinerator energy. Always use the values shown by the Burn Room for
            the selected NFT.
          </p>
        </div>

        <div className="guide-link-row">
          <GuideRouteLink to="/burn">Open Burn Center</GuideRouteLink>
        </div>

        <ul>
          <li>TRASH is used as fuel for Incinerators</li>
          <li>Supported NFTs are burned through the Burn Center</li>
          <li>Burning creates CINDER</li>
          <li>CINDER is used to buy energy</li>
          <li>Energy powers Incinerators and farm systems</li>
        </ul>

        <p>
          This creates a real utility loop where destruction feeds production.
          Instead of worthless or extra NFTs sitting idle, they can become part
          of a larger economy through the burn process.
        </p>

        <div className="guide-subsection">
          <h4>🔥 Incinerators</h4>
          <p>
            Incinerators are specialized utility NFTs used in the Burn Center.
            They are core gameplay assets, not cosmetic items. If you want to
            participate in CleanupCentr’s burn economy, Incinerators are a key
            part of that process.
          </p>

          <p>
            Incinerators use <strong>TRASH</strong> as fuel. When players burn
            supported NFTs through them, they help create
            <strong> CINDER</strong>. That CINDER then becomes part of the wider
            production loop by being used to buy energy for major game systems.
          </p>

          <ul>
            <li>Incinerators are NFT-based burn machines</li>
            <li>They consume TRASH as fuel</li>
            <li>They are used to burn supported NFTs</li>
            <li>They help create CINDER</li>
            <li>They feed the energy economy of the game</li>
          </ul>

          <div className="guide-link-row">
            <a
              href="https://f12key.eu/market?collection_name=cleanupcentr&schema_name=incinerators&sort=created&order=desc&symbol=WAX&page=1"
              target="_blank"
              rel="noopener noreferrer"
              className="guide-link-button"
            >
              View Incinerators on Marketplace
            </a>
          </div>
        </div>
      </Section>

     <Section id="energy-system" title="⚡ Energy System">
       <p>
         Energy is one of the core resources that ties CleanupCentr together. It is
         what powers active production across multiple systems in the game.
       </p>

       <p>
         Players create CINDER through the Burn Center, then use that CINDER to buy
         energy. That energy is used to run key gameplay systems and keep production
         moving.
       </p>

       <div className="guide-grid">
         <Card title="Personal Energy">
           Personal energy belongs to your account and pays your share of
           farming actions. A configured Simple Core currently adds 250 maximum
           personal energy.
         </Card>

         <Card title="Farm Energy">
           Farm energy belongs to the farm hosting the Plot. A configured Farm
           Cell currently adds 90,000 maximum farm energy. On a global farm, its
           owner is responsible for maintaining this supply.
         </Card>

         <Card title="Recharge Rate">
           Personal and farm recharge controls are separate, but both currently
           use CINDER at the live rate of 1 CINDER for 2 energy.
         </Card>

         <Card title="Capacity Protection">
           The contract rejects an over-capacity recharge. A personal cell
           cannot be unstaked if current energy would exceed the remaining
           capacity, and a farm cell cannot be removed until farm energy is zero.
         </Card>
       </div>

       <div className="guide-link-row">
         <GuideRouteLink to="/farming">Manage Farming Energy</GuideRouteLink>
       </div>

       <ul>
         <li>CINDER is converted into usable energy</li>
         <li>Energy powers Incinerators</li>
         <li>Energy powers farming systems</li>
         <li>Energy powers machine processing</li>
         <li>Energy connects the burn loop to production systems</li>
       </ul>

       <p>
         This means the Burn Center does not stand alone. It feeds energy into
         farming and machines, allowing players to build a full production network
         instead of isolated systems.
       </p>
     </Section>

      <Section title="🌱 Farming">
  <p>
    Farming is one of the main production systems in CleanupCentr. It is where
    players generate long-term value by combining land capacity, seeds, tools,
    and energy into ongoing production.
  </p>

  <ul>
    <li><strong>Plots</strong> represent farming capacity</li>
    <li><strong>Compost</strong> is used as a planting input</li>
    <li><strong>Tools</strong> are equipped separately for watering and harvesting</li>
    <li><strong>Energy</strong> powers farming systems</li>
  </ul>

  <div className="guide-subsection">
    <h4>🌾 Seeds & Yield</h4>
    <p>
      Seeds define what your farm produces. Different seeds can generate
      different outputs, yields, and gameplay opportunities.
    </p>

    <ul>
      <li>Each seed template defines its own watering-tick requirement</li>
      <li>Each completed seed credits its configured base TOMATOE yield</li>
      <li>All currently configured seeds use an eight-hour watering interval</li>
      <li>The first watering tick is available immediately after planting</li>
    </ul>

    <p>
      In the current contract, harvest yield comes from the seed template's
      configured base yield. The equipped tools authorize the action, while
      energy is consumed to perform it; neither currently multiplies the yield.
    </p>
  </div>

  <div className="guide-subsection">
    <h4>🍅 Fruits & Outputs</h4>
    <p>
      Farming does not just produce a single resource. It can generate a variety
      of outputs that feed into other systems in the game.
    </p>

    <ul>
      <li>Primary resources (like TOMATOE)</li>
      <li>Special or rare outputs</li>
      <li>Materials for blends and machines</li>
      <li>Items that can be burned for value</li>
    </ul>

    <p>
      This makes farming a central production engine that connects to both the
      Burn Center and machine systems.
    </p>
  </div>

  <p>
    Farming is important because it provides a steady and scalable way to build
    value over time. While the Burn Center drives resource conversion, farming
    builds production capacity and long-term growth.
  </p>
</Section>

      <Section id="machines" title="⚙️ Machines">
        <p>
          Machines are production assets that process inputs into outputs over
          time. They are one of the most important systems for scaling beyond the
          early game.
        </p>

        <ul>
          <li>Stake a machine NFT</li>
          <li>Deposit required NFT or token inputs</li>
          <li>Select a recipe</li>
          <li>Wait through the machine cooldown</li>
          <li>Claim outputs when processing is complete</li>
        </ul>

        <p>
          Some machine recipes can use RNG, which means outputs may vary. Machines
          reward players who plan ahead, manage inputs well, and build around
          production efficiency.
        </p>

        <div className="guide-link-row">
          <GuideRouteLink to="/machines">Open Machines</GuideRouteLink>
        </div>
      </Section>

      <Section title="📦 Packs">
        <p>
          Packs are one of the easiest ways for players to enter CleanupCentr.
          They help bootstrap inventory and provide useful items that feed into
          the rest of the game.
        </p>

        <ul>
          <li>Open packs to receive randomized NFTs</li>
          <li>Gain access to useful production and utility items</li>
          <li>Use pack contents in burn, farming, or blends</li>
        </ul>

        <p>
          Packs are especially important for newer players because they can
          provide the first materials needed to start participating in the
          ecosystem.
        </p>

        <div className="guide-subsection">
          <h4>Opening a Pack</h4>
          <ol>
            <li>Buy the pack in Shop and approve the Anchor transaction.</li>
            <li>Open Farming and expand the Packs group in your Bag.</li>
            <li>Select Open and approve the NFT transfer to the game contract.</li>
            <li>Wait for the Bag to poll the indexed inventory and reveal new items.</li>
          </ol>
          <p>
            Seed packs grant configured seed quantities. Other crates can use a
            blend recipe and randomized loot table, including weighted rewards
            or a blank outcome. Always inspect View Drops before purchasing.
          </p>
        </div>

        <div className="guide-highlight">
          If Anchor confirms the transaction but loot is not visible yet, do not
          submit the same pack again. Wait a few seconds and use the Farming or
          Bag refresh control while AtomicAssets and the backend finish indexing.
        </div>

        <div className="guide-link-row">
          <GuideRouteLink to="/shop">Browse Packs</GuideRouteLink>
        </div>
      </Section>

      <Section id="blends" title="🔄 Blends">
        <p>
          Blending is how players turn inputs into upgraded or transformed
          assets. It is one of the main progression systems in the game.
        </p>

        <ul>
          <li>Combine NFTs and sometimes tokens into new assets</li>
          <li>Create upgraded utility items and progression pieces</li>
          <li>Turn lower-tier materials into stronger long-term value</li>
        </ul>

        <p>
          Blends help connect the whole economy. They give purpose to existing
          materials and make progression feel like building rather than just
          collecting.
        </p>

        <div className="guide-link-row">
          <GuideRouteLink to="/recipes">Open Blends</GuideRouteLink>
        </div>
      </Section>

      <Section title="💰 Resources & Economy">
        <div className="guide-grid">
          <Card title="TRASH">
            The main fuel resource used to power Incinerators in the Burn Center.
          </Card>

          <Card title="CINDER">
            Created through burning and used to buy energy for Incinerators and
            farming systems.
          </Card>

          <Card title="Energy">
            A production power resource used to keep important systems running.
          </Card>

          <Card title="Compost">
            A foundational farming input used for planting, blends, and
            progression.
          </Card>

          <Card title="Plots">
            Land capacity NFTs that support farming gameplay.
          </Card>

          <Card title="Tools">
            Utility NFTs used for farming actions, harvesting, and system
            interaction.
          </Card>
        </div>
      </Section>

      <Section title="📈 Progression">
        <div className="guide-progression">
          <div className="guide-progression-stage">
            <h4>Early Game</h4>
            <p>
              Start by getting your first useful assets, especially packs or an
              Incinerator. Learn how TRASH, burning, CINDER, and energy connect.
            </p>
          </div>

          <div className="guide-progression-stage">
            <h4>Mid Game</h4>
            <p>
              Build into farming by collecting plots, compost, and tools. Start
              using blends and utility items to strengthen your production base.
            </p>
          </div>

          <div className="guide-progression-stage">
            <h4>Late Game</h4>
            <p>
              Expand into machines, optimize your inputs, and manage multiple
              connected systems together. At this stage, CleanupCentr becomes a
              deeper production and resource strategy game.
            </p>
          </div>
        </div>
      </Section>

      <Section id="troubleshooting" title="🧰 Troubleshooting">
        <div className="guide-grid">
          <Card title="Transaction Succeeded, Item Missing">
            AtomicAssets or backend indexing can lag behind the blockchain.
            Wait a few seconds and refresh the relevant page before submitting
            the same action again.
          </Card>
          <Card title="Cannot Plant">
            Confirm that the plot belongs to the selected farm, its slot is
            empty, one seed is available, one compost is deposited, and both
            personal and farm energy can cover the action.
          </Card>
          <Card title="Cannot Water">
            Equip a Watering tool. The first tick is immediate; later ticks are
            available only after the seed's eight-hour cooldown. Water All skips
            plots that are not eligible yet.
          </Card>
          <Card title="Cannot Harvest">
            The crop must show Ready after every watering tick, and a Harvesting
            tool must be equipped. Harvest also requires personal and farm energy.
          </Card>
          <Card title="Cannot Recharge">
            Current recharge costs 1 CINDER and grants 2 energy, up to the
            relevant capacity. Make sure CINDER is available and the personal or
            farm energy storage is not already full.
          </Card>
          <Card title="Anchor or Resource Error">
            Reopen Anchor, confirm the correct account, and check WAX CPU and RAM
            in the resource bar. A rejected or expired wallet request does not
            complete the game action.
          </Card>
        </div>
        <div className="guide-highlight">
          Read the final Anchor or contract error before retrying. Avoid repeated
          clicks while a transaction or inventory refresh is still processing.
        </div>
      </Section>

      <Section id="encyclopedia" title="📚 Use the Encyclopedia">
        <p>
          The Encyclopedia is where you can learn more about the NFTs and assets
          that make up the CleanupCentr ecosystem. Use it to understand what each
          item does, where it fits, and how it supports the larger game loop.
        </p>
        <div className="guide-link-row">
          <GuideRouteLink to="/collections">Open Encyclopedia</GuideRouteLink>
        </div>
      </Section>
    </div>
  );
}
