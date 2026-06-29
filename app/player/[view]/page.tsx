import { notFound } from "next/navigation";
import { DetailPage } from "@/components/detail-page";
import { InventoryPage } from "@/components/inventory-page";
import { PlayerClassPage } from "@/components/player-class-page";
import { PlayerSheetPage } from "@/components/player-sheet-page";
import { StagePage } from "@/components/stage-page";
import { WorkspaceShell } from "@/components/workspace-shell";
import { abilities, craftingProjects, knowledgeEntries, recentNotes } from "@/data/sample-data";

const titles = {
  sheet: {
    eyebrow: "Trailblazer License",
    title: "Gideon Vale, Oathbroken Warden",
    copy: "The character sheet view for a Trailblazer License: attributes, coinpurse, proficiencies, armor, and weapon slots.",
  },
  inventory: {
    eyebrow: "Inventory",
    title: "Pack, Relics, Currency",
    copy: "A dedicated place for equipment, attunement, supplies, and stored items.",
  },
  class: {
    eyebrow: "Class",
    title: "Warden of the Second Hour",
    copy: "Class identity, progression, features, vows, and specialization notes live here.",
  },
  knowledge: {
    eyebrow: "Knowledge",
    title: "Known Lore and Discoveries",
    copy: "Trailblazer-facing campaign knowledge, met NPCs, rumors, secrets learned, and unanswered questions.",
  },
  skills: {
    eyebrow: "Skills and Abilities",
    title: "Checks, Focus, Talents",
    copy: "The quick-reference page for trained skills, combat options, and special abilities.",
  },
  notes: {
    eyebrow: "Notes",
    title: "Personal Session Journal",
    copy: "Private notes, shared notes, and session reflections for the character.",
  },
  crafting: {
    eyebrow: "Crafting",
    title: "Recipes and Projects",
    copy: "Track recipes, materials, downtime projects, and experimental constructions.",
  },
  stage: {
    eyebrow: "Live Stage",
    title: "Session Table",
    copy: "A Trailblazer view for video tiles, maps, handouts, event popups, and live resources during play.",
  },
};

type TrailblazerView = keyof typeof titles;

export default async function TrailblazerRoutePage({ params }: { params: Promise<{ view: string }> }) {
  const { view } = await params;
  if (!isTrailblazerView(view)) notFound();
  if (view === "sheet") return <PlayerSheetPage />;

  const title = titles[view];

  return (
    <WorkspaceShell role="trailblazer" eyebrow={title.eyebrow} title={title.title} copy={title.copy}>
      <TrailblazerContent view={view} />
    </WorkspaceShell>
  );
}

function TrailblazerContent({ view }: { view: TrailblazerView }) {
  if (view === "inventory") return <InventoryPage />;
  if (view === "class") return <PlayerClassPage />;
  if (view === "knowledge") {
    return (
      <DetailPage
        mainTitle="Known Lore"
        items={knowledgeEntries}
        sideTitle="Open Questions"
        sideItems={["Who broke the Meridian seals?", "Why does the Aeon Lens pulse?", "What is House Veyr hiding?"]}
      />
    );
  }
  if (view === "skills") {
    return (
      <DetailPage
        mainTitle="Abilities"
        items={abilities}
        sideTitle="Skill Proficiencies"
        sideItems={["Athletics", "Insight", "Arcana", "Survival", "Intimidation"]}
      />
    );
  }
  if (view === "notes") {
    return (
      <DetailPage
        mainTitle="Recent Notes"
        items={recentNotes}
        sideTitle="Note Spaces"
        sideItems={["Private notes", "Shared party notes", "Session recap", "Chronicler-visible questions"]}
      />
    );
  }
  if (view === "crafting") {
    return (
      <DetailPage
        mainTitle="Crafting Projects"
        items={craftingProjects}
        sideTitle="Materials"
        sideItems={["Volatile amber: 2", "Brass casing: 1", "Moon-salt: 4", "Etching cloth: 3"]}
      />
    );
  }
  return <StagePage isDm={false} />;
}

function isTrailblazerView(view: string): view is TrailblazerView {
  return view in titles;
}
