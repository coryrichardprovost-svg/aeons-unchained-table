import { notFound } from "next/navigation";
import { DetailPage, TablePage } from "@/components/detail-page";
import { StagePage } from "@/components/stage-page";
import { WorkspaceShell } from "@/components/workspace-shell";
import { campaigns } from "@/data/sample-data";

const titles = {
  campaigns: {
    eyebrow: "Campaign Builder",
    title: "Worlds, Arcs, and Invitations",
    copy: "Create campaigns, organize the playable frame, then invite Trailblazers by username or email.",
  },
  players: {
    eyebrow: "Trailblazer Invites",
    title: "Party and Access",
    copy: "Invite Trailblazers by username or email, assign them to campaigns, and manage who can enter the stage.",
  },
  world: {
    eyebrow: "World Atlas",
    title: "Regions, Landscapes, and Maps",
    copy: "Build locations, landscapes, regions, stage maps, and grid-ready scenes for the party to view.",
  },
  npcs: {
    eyebrow: "NPC Forge",
    title: "People, Factions, and Met NPCs",
    copy: "Create NPCs quickly, track private Chronicler notes, and publish met NPCs into Trailblazer knowledge.",
  },
  quests: {
    eyebrow: "Quest Ledger",
    title: "Hooks, Objectives, and Consequences",
    copy: "Track quests, discoveries, consequences, and session-to-session story threads.",
  },
  market: {
    eyebrow: "Markets and Items",
    title: "Regional Prices and Shared Items",
    copy: "Create items, edit prices by region, and keep Trailblazer inventory data synced to the same source of truth.",
  },
  rules: {
    eyebrow: "Rules Library",
    title: "Classes, Species, Skills, and Abilities",
    copy: "Maintain Nate's custom rules so every Trailblazer character sheet uses current game data.",
  },
  sessions: {
    eyebrow: "Session Organizer",
    title: "Prep, Schedule, Run",
    copy: "Plan sessions, queue maps and resources, and move a campaign toward live play.",
  },
  resources: {
    eyebrow: "Resource Library",
    title: "Maps, Handouts, Encounters",
    copy: "A future home for uploaded maps, NPC cards, clues, handouts, and encounter tools.",
  },
  stage: {
    eyebrow: "Live Stage",
    title: "Chronicler Stage View",
    copy: "A hosted space for video, map display, event popups, Trailblazer positioning, and session resources.",
  },
};

type DmView = keyof typeof titles;

export default async function DmRoutePage({ params }: { params: Promise<{ view: string }> }) {
  const { view } = await params;
  if (!isDmView(view)) notFound();
  const title = titles[view];

  return (
    <WorkspaceShell role="chronicler" eyebrow={title.eyebrow} title={title.title} copy={title.copy}>
      <DmContent view={view} />
    </WorkspaceShell>
  );
}

function DmContent({ view }: { view: DmView }) {
  if (view === "campaigns") {
    return (
      <>
        <TablePage title="Campaigns" rows={campaigns} tag="Chronicler controlled" />
        <section className="list-card section-gap">
          <div className="list-header">
            <h3>Campaign Design Shell</h3>
            <span className="tag gold">Future builder</span>
          </div>
          <div className="split-two">
            <label className="field">
              <span>Campaign Name</span>
              <input value="Master of Strings" readOnly />
            </label>
            <label className="field">
              <span>Trailblazer Invite</span>
              <input value="@username" readOnly />
            </label>
          </div>
          <label className="field">
            <span>Campaign Premise</span>
            <textarea value="Nate's active Aeons Unchained campaign. This space will replace scattered Excel sheets with a single world, story, rules, map, and session source." readOnly />
          </label>
        </section>
      </>
    );
  }

  if (view === "players") {
    return (
      <TablePage
        title="Invited Trailblazers"
        tag="Username / Invite / Character"
        rows={[
          ["Cory", "Accepted", "Gideon Vale"],
          ["Mara", "Pending", "No character"],
          ["Jules", "Accepted", "Eris Dawn"],
          ["Ren", "Invited", "No character"],
        ]}
      />
    );
  }

  if (view === "world") {
    return (
      <DetailPage
        mainTitle="World Builder Modules"
        items={[
          ["Maps and Landscapes", "Grid-ready scenes the Chronicler can place on the stage."],
          ["Regions", "Regional lore, pricing rules, travel notes, and location state."],
          ["Public Knowledge Exports", "Lore that can be pushed into Trailblazer knowledge tabs."],
          ["Private World Notes", "Chronicler-only material for future reveals."],
        ]}
        sideTitle="Next Builder Needs"
        sideItems={["Map canvas", "Grid toggle", "Region records", "Location visibility"]}
      />
    );
  }

  if (view === "npcs") {
    return (
      <DetailPage
        mainTitle="NPC Creation Flow"
        items={[
          ["Quick Add NPC", "Plus-button creation during prep or live play."],
          ["Met NPC Toggle", "Publish the safe version to Trailblazer knowledge."],
          ["Faction Links", "Connect NPCs to regions, quests, and story arcs."],
          ["Private Secrets", "Keep unrevealed motives hidden from Trailblazers."],
        ]}
        sideTitle="NPC Fields"
        sideItems={["Name", "Region", "Faction", "Disposition", "Known by Trailblazers", "Secret notes"]}
      />
    );
  }

  if (view === "quests") {
    return (
      <DetailPage
        mainTitle="Quest and Story Tools"
        items={[
          ["Active Quests", "Visible objectives the Trailblazers can track."],
          ["Hidden Threads", "Chronicler-only consequences and future hooks."],
          ["Session Beats", "Scenes, reveals, choices, and event popups."],
          ["Aftermath", "Update world state after each session."],
        ]}
        sideTitle="Story States"
        sideItems={["Draft", "Offered", "Active", "Completed", "Failed", "Hidden"]}
      />
    );
  }

  if (view === "market") {
    return (
      <DetailPage
        mainTitle="Shared Item and Price Data"
        items={[
          ["Item Catalog", "The canonical item list Trailblazer inventories use."],
          ["Regional Pricing", "Price modifiers based on where the party is."],
          ["Availability", "Control what can be bought in each region."],
          ["Equipment Slots", "Weapons and armor can connect to License displays."],
        ]}
        sideTitle="Market Controls"
        sideItems={["Base price", "Region modifier", "Rarity", "Stock", "License visibility"]}
      />
    );
  }

  if (view === "rules") {
    return (
      <DetailPage
        mainTitle="Custom Rule Sources"
        items={[
          ["Classes", "Chronicler-maintained class definitions and progression."],
          ["Species", "Playable origins, traits, and restrictions."],
          ["Skills", "Shared skill list used by every Trailblazer License."],
          ["Abilities", "Powers, talents, and actions that can be assigned to characters."],
        ]}
        sideTitle="Rule Sync"
        sideItems={["Versioned records", "Assigned to Licenses", "Visible to Trailblazers", "Chronicler edits propagate"]}
      />
    );
  }

  if (view === "sessions") {
    return (
      <DetailPage
        mainTitle="Session Timeline"
        items={[
          ["Session 01", "The bell below Ilyra rang at midnight."],
          ["Session 02", "The party discovered the second seal."],
          ["Session 03", "Prepared stage session with map queue."],
        ]}
        sideTitle="Run Checklist"
        sideItems={["Confirm Trailblazer attendance", "Select opening scene", "Load first map", "Pin recap handout"]}
      />
    );
  }

  if (view === "resources") {
    return (
      <DetailPage
        mainTitle="Resource Library"
        items={[
          ["Meridian Gate", "Battle map"],
          ["House Veyr Signet", "Handout"],
          ["Oracle's Warning", "Read-aloud text"],
          ["Ash Warden", "NPC card"],
        ]}
        sideTitle="Upload Slots"
        sideItems={["Maps", "Tokens", "Handouts", "Music cues"]}
      />
    );
  }

  return <StagePage isDm />;
}

function isDmView(view: string): view is DmView {
  return view in titles;
}
