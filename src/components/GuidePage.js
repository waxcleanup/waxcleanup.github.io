// src/components/GuidePage.js
import React from 'react';
import './GuidePage.css';

function Section({ title, children }) {
  return (
    <section className="guide-section">
      <h3>{title}</h3>
      <div className="guide-content">{children}</div>
    </section>
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

      <Section title="🔥 Burn Center">
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

     <Section title="⚡ Energy System">
       <p>
         Energy is one of the core resources that ties CleanupCentr together. It is
         what powers active production across multiple systems in the game.
       </p>

       <p>
         Players create CINDER through the Burn Center, then use that CINDER to buy
         energy. That energy is used to run key gameplay systems and keep production
         moving.
       </p>

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
    <li><strong>Tools</strong> are used for harvesting and interaction</li>
    <li><strong>Energy</strong> powers farming systems</li>
  </ul>

  <div className="guide-subsection">
    <h4>🌾 Seeds & Yield</h4>
    <p>
      Seeds define what your farm produces. Different seeds can generate
      different outputs, yields, and gameplay opportunities.
    </p>

    <ul>
      <li>Basic seeds produce standard resources</li>
      <li>Advanced seeds can increase yield efficiency</li>
      <li>Hybrid seeds may produce multiple outputs</li>
      <li>Rare seeds can unlock special rewards or drops</li>
    </ul>

    <p>
      Yield is influenced by multiple factors including seed type, tool quality,
      and energy input.
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

      <Section title="⚙️ Machines">
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
      </Section>

      <Section title="🔄 Blends">
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

      <Section title="🚀 Getting Started">
        <Step number="1" title="Get Your First Assets">
          Start with packs, burnable NFTs, or an Incinerator so you can begin
          participating in the game economy.
        </Step>

        <Step number="2" title="Learn the Burn Loop">
          Use the Burn Center to understand how TRASH fuels Incinerators, how
          burning creates CINDER, and how CINDER supports energy.
        </Step>

        <Step number="3" title="Build Toward Farming">
          Collect compost, plots, and tools so you can begin creating a more
          stable production setup.
        </Step>

        <Step number="4" title="Expand Into Machines">
          Once you have enough materials and supporting systems, begin using
          machines for larger-scale production.
        </Step>

        <Step number="5" title="Reinvest and Scale">
          Keep cycling your resources back into the game so your production
          network becomes stronger over time.
        </Step>
      </Section>

      <Section title="📚 Use the Encyclopedia">
        <p>
          The Encyclopedia is where you can learn more about the NFTs and assets
          that make up the CleanupCentr ecosystem. Use it to understand what each
          item does, where it fits, and how it supports the larger game loop.
        </p>
      </Section>
    </div>
  );
}