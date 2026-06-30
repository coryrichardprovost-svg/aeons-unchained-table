"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type WorldLocation = {
  id: string;
  parent_location_id: string | null;
  name: string;
  location_type: string;
};

type CreatureRecord = {
  id: string;
  owner_user_id: string | null;
  name: string;
  creature_type: string;
  image_url: string;
  description: string;
  origin_location_id: string | null;
  strengths: string;
  weaknesses: string;
  visibility: "chronicler" | "players";
};

type KnowledgeCategory = (typeof knowledgeTabs)[number];

type KnowledgeEntry = {
  id: string;
  owner_user_id: string | null;
  category: KnowledgeCategory;
  name: string;
  entry_type: string;
  image_url: string;
  summary: string;
  details: string;
  location_id: string | null;
  environment: string;
  rarity: string;
  visibility: "chronicler" | "hinted" | "discovered" | "players";
};

const knowledgeTabs = ["Bestiary", "Fauna", "Flora", "Enemies", "Factions", "History", "Cultures", "Magic", "Artifacts", "Materials", "Secrets"] as const;
const genericTabs = knowledgeTabs.filter((tab) => tab !== "Bestiary") as KnowledgeCategory[];

export function ChroniclerKnowledgePage() {
  const router = useRouter();
  const [creatures, setCreatures] = useState<CreatureRecord[]>([]);
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [locations, setLocations] = useState<WorldLocation[]>([]);
  const [activeTab, setActiveTab] = useState<KnowledgeCategory>("Bestiary");
  const [searchTerm, setSearchTerm] = useState("");
  const [continentId, setContinentId] = useState("");
  const [regionId, setRegionId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [specificId, setSpecificId] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadKnowledge = useCallback(async () => {
    const supabase = createClient();
    const [{ data: creatureData, error: creatureError }, { data: entryData, error: entryError }, { data: locationData, error: locationError }] =
      await Promise.all([
        supabase.from("bestiary_creatures").select("*").order("name", { ascending: true }),
        supabase.from("knowledge_entries").select("*").order("name", { ascending: true }),
        supabase.from("world_locations").select("id,parent_location_id,name,location_type").order("name", { ascending: true }),
      ]);

    if (creatureError) {
      setMessage(creatureError.message.includes("bestiary_creatures") ? "Run supabase/migrations/018_rebuild_bestiary_access.sql in Supabase SQL Editor." : creatureError.message);
      setIsLoading(false);
      return;
    }

    if (entryError) {
      setMessage(entryError.message.includes("knowledge_entries") ? "Run supabase/migrations/019_add_knowledge_entries.sql in Supabase SQL Editor." : entryError.message);
      setIsLoading(false);
      return;
    }

    if (locationError) {
      setMessage(locationError.message);
      setIsLoading(false);
      return;
    }

    setCreatures((creatureData || []) as CreatureRecord[]);
    setEntries((entryData || []) as KnowledgeEntry[]);
    setLocations((locationData || []) as WorldLocation[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Knowledge records load after the browser Supabase session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadKnowledge();
  }, [loadKnowledge]);

  const continents = useMemo(() => locations.filter((location) => location.location_type === "Continent" && !location.parent_location_id), [locations]);
  const regions = useMemo(() => locations.filter((location) => location.parent_location_id === continentId), [locations, continentId]);
  const areas = useMemo(() => locations.filter((location) => location.parent_location_id === regionId), [locations, regionId]);
  const specifics = useMemo(() => locations.filter((location) => location.parent_location_id === areaId), [locations, areaId]);
  const selectedLocationId = specificId || areaId || regionId || continentId;
  const selectedLocationIds = useMemo(() => getLocationBranchIds(selectedLocationId, locations), [locations, selectedLocationId]);

  const filteredCreatures = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    return creatures.filter((creature) => {
      const matchesSearch = !cleanSearch || creature.name.toLowerCase().includes(cleanSearch) || creature.creature_type.toLowerCase().includes(cleanSearch);
      const matchesLocation = selectedLocationIds.size === 0 || (creature.origin_location_id ? selectedLocationIds.has(creature.origin_location_id) : false);
      return matchesSearch && matchesLocation;
    });
  }, [creatures, searchTerm, selectedLocationIds]);

  const filteredEntries = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesTab = entry.category === activeTab;
      const matchesSearch =
        !cleanSearch ||
        entry.name.toLowerCase().includes(cleanSearch) ||
        entry.entry_type.toLowerCase().includes(cleanSearch) ||
        entry.summary.toLowerCase().includes(cleanSearch);
      const matchesLocation = selectedLocationIds.size === 0 || (entry.location_id ? selectedLocationIds.has(entry.location_id) : false);
      return matchesTab && matchesSearch && matchesLocation;
    });
  }, [activeTab, entries, searchTerm, selectedLocationIds]);

  async function createCreature() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("bestiary_creatures")
      .insert({
        owner_user_id: user?.id,
        name: "New Creature",
        origin_location_id: selectedLocationId || null,
      })
      .select("id")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push(`/dm/knowledge/bestiary/${(data as { id: string }).id}`);
  }

  async function createKnowledgeEntry() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("knowledge_entries")
      .insert({
        owner_user_id: user?.id,
        category: activeTab,
        name: `New ${activeTab} Entry`,
        location_id: selectedLocationId || null,
      })
      .select("*")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setEntries((current) => [data as KnowledgeEntry, ...current]);
    setMessage(`${activeTab} entry created.`);
  }

  function updateEntry(entry: KnowledgeEntry) {
    setEntries((current) => current.map((candidate) => (candidate.id === entry.id ? entry : candidate)));
  }

  async function deleteEntry(entryId: string) {
    const entry = entries.find((candidate) => candidate.id === entryId);
    if (!entry) return;
    const confirmed = window.confirm(`Delete ${entry.name}?`);
    if (!confirmed) return;

    const supabase = createClient();
    const { error } = await supabase.from("knowledge_entries").delete().eq("id", entryId);
    if (error) {
      setMessage(error.message);
      return;
    }

    setEntries((current) => current.filter((candidate) => candidate.id !== entryId));
  }

  function resetLocationFilter(level: "continent" | "region" | "area" | "specific", value: string) {
    if (level === "continent") {
      setContinentId(value);
      setRegionId("");
      setAreaId("");
      setSpecificId("");
    }
    if (level === "region") {
      setRegionId(value);
      setAreaId("");
      setSpecificId("");
    }
    if (level === "area") {
      setAreaId(value);
      setSpecificId("");
    }
    if (level === "specific") {
      setSpecificId(value);
    }
  }

  return (
    <div className="knowledge-dashboard">
      {message ? <p className="form-message">{message}</p> : null}

      <section className="list-card knowledge-toolbar">
        <div className="list-header">
          <div>
            <h3>Chronicler Knowledge</h3>
            <p className="subcopy">Build the private lore library and focus it by any area in the World Atlas.</p>
          </div>
          <button className="primary-inline-button compact-action" onClick={activeTab === "Bestiary" ? createCreature : createKnowledgeEntry}>
            New {activeTab === "Bestiary" ? "Creature" : activeTab}
          </button>
        </div>

        <div className="knowledge-tabs" role="tablist" aria-label="Knowledge sections">
          {knowledgeTabs.map((tab) => (
            <button className={`knowledge-tab ${activeTab === tab ? "active" : ""}`} key={tab} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>
      </section>

      <section className="list-card knowledge-filter-card">
        <label className="field knowledge-search-field">
          <span>Search {activeTab}</span>
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Name, type, or description" />
        </label>
        <label className="field">
          <span>Continent</span>
          <select value={continentId} onChange={(event) => resetLocationFilter("continent", event.target.value)}>
            <option value="">All continents</option>
            {continents.map((location) => (
              <option value={location.id} key={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Region</span>
          <select value={regionId} onChange={(event) => resetLocationFilter("region", event.target.value)} disabled={!continentId}>
            <option value="">All regions</option>
            {regions.map((location) => (
              <option value={location.id} key={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>City, Town, or Place</span>
          <select value={areaId} onChange={(event) => resetLocationFilter("area", event.target.value)} disabled={!regionId}>
            <option value="">All areas</option>
            {areas.map((location) => (
              <option value={location.id} key={location.id}>
                {location.name} ({location.location_type})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Specific Location</span>
          <select value={specificId} onChange={(event) => resetLocationFilter("specific", event.target.value)} disabled={!areaId}>
            <option value="">All specific locations</option>
            {specifics.map((location) => (
              <option value={location.id} key={location.id}>
                {location.name} ({location.location_type})
              </option>
            ))}
          </select>
        </label>
      </section>

      {activeTab === "Bestiary" ? (
        <section className="bestiary-card-grid">
          {filteredCreatures.map((creature) => (
            <Link className="bestiary-card" href={`/dm/knowledge/bestiary/${creature.id}`} key={creature.id}>
              <div className="bestiary-card-image" style={creature.image_url ? { backgroundImage: `url(${creature.image_url})` } : undefined}>
                {!creature.image_url ? creature.name.slice(0, 1).toUpperCase() : null}
              </div>
              <div className="bestiary-card-body">
                <div>
                  <strong>{creature.name}</strong>
                  <span>{creature.creature_type || "Unknown creature type"}</span>
                </div>
                <p>{creature.description || "No creature description yet."}</p>
                <div className="market-card-meta">
                  <span className="tag teal">{getLocationLabel(creature.origin_location_id, locations)}</span>
                  <span className="tag">{creature.visibility}</span>
                </div>
              </div>
            </Link>
          ))}

          {!isLoading && filteredCreatures.length === 0 ? (
            <div className="empty-state">
              <strong>No creatures found.</strong>
              <span>Create a creature or clear the search and area filters.</span>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="knowledge-entry-grid">
          {filteredEntries.map((entry) => (
            <KnowledgeEntryCard
              entry={entry}
              locations={locations}
              onChange={updateEntry}
              onDelete={() => deleteEntry(entry.id)}
              key={entry.id}
            />
          ))}

          {!isLoading && filteredEntries.length === 0 ? (
            <div className="empty-state">
              <strong>No {activeTab.toLowerCase()} entries found.</strong>
              <span>Create an entry or clear the search and area filters.</span>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}

function KnowledgeEntryCard({
  entry,
  locations,
  onChange,
  onDelete,
}: {
  entry: KnowledgeEntry;
  locations: WorldLocation[];
  onChange: (entry: KnowledgeEntry) => void;
  onDelete: () => void;
}) {
  const [localEntry, setLocalEntry] = useState(entry);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saveTimer = window.setTimeout(async () => {
      if (JSON.stringify(localEntry) === JSON.stringify(entry)) return;
      const supabase = createClient();
      setMessage("Saving...");

      const { error } = await supabase
        .from("knowledge_entries")
        .update({
          name: localEntry.name.trim() || `Unnamed ${localEntry.category}`,
          entry_type: localEntry.entry_type,
          image_url: localEntry.image_url,
          summary: localEntry.summary,
          details: localEntry.details,
          location_id: localEntry.location_id || null,
          environment: localEntry.environment,
          rarity: localEntry.rarity,
          visibility: localEntry.visibility,
        })
        .eq("id", localEntry.id);

      if (error) {
        setMessage(error.message);
        return;
      }

      onChange({ ...localEntry, name: localEntry.name.trim() || `Unnamed ${localEntry.category}` });
      setMessage("Saved.");
    }, 650);

    return () => window.clearTimeout(saveTimer);
  }, [entry, localEntry, onChange]);

  function patchEntry(patch: Partial<KnowledgeEntry>) {
    setLocalEntry((current) => ({ ...current, ...patch }));
  }

  return (
    <article className="knowledge-entry-card">
      <div className="knowledge-entry-image" style={localEntry.image_url ? { backgroundImage: `url(${localEntry.image_url})` } : undefined}>
        {!localEntry.image_url ? localEntry.category.slice(0, 1) : null}
      </div>
      <div className="knowledge-entry-body">
        <div className="knowledge-entry-heading">
          <label className="field">
            <span>Name</span>
            <input value={localEntry.name} onChange={(event) => patchEntry({ name: event.target.value })} />
          </label>
          <label className="field">
            <span>Type</span>
            <input value={localEntry.entry_type} onChange={(event) => patchEntry({ entry_type: event.target.value })} placeholder={getTypePlaceholder(localEntry.category)} />
          </label>
        </div>

        <div className="knowledge-entry-small-grid">
          <label className="field">
            <span>Area</span>
            <select value={localEntry.location_id || ""} onChange={(event) => patchEntry({ location_id: event.target.value || null })}>
              <option value="">No area</option>
              {locations.map((location) => (
                <option value={location.id} key={location.id}>
                  {location.name} ({location.location_type})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Environment</span>
            <input value={localEntry.environment} onChange={(event) => patchEntry({ environment: event.target.value })} placeholder="Forest, ruins, coast" />
          </label>
          <label className="field">
            <span>Rarity</span>
            <input value={localEntry.rarity} onChange={(event) => patchEntry({ rarity: event.target.value })} placeholder="Common, rare, unique" />
          </label>
          <label className="field">
            <span>Visibility</span>
            <select value={localEntry.visibility} onChange={(event) => patchEntry({ visibility: event.target.value as KnowledgeEntry["visibility"] })}>
              <option value="chronicler">Chronicler Only</option>
              <option value="hinted">Hinted</option>
              <option value="discovered">Discovered</option>
              <option value="players">Player Visible Later</option>
            </select>
          </label>
        </div>

        <label className="field">
          <span>Image URL</span>
          <input value={localEntry.image_url} onChange={(event) => patchEntry({ image_url: event.target.value })} />
        </label>

        <label className="field">
          <span>Summary</span>
          <textarea value={localEntry.summary} onChange={(event) => patchEntry({ summary: event.target.value })} />
        </label>

        <label className="field">
          <span>Details</span>
          <textarea value={localEntry.details} onChange={(event) => patchEntry({ details: event.target.value })} />
        </label>

        <div className="knowledge-entry-footer">
          <span>{message || getLocationLabel(localEntry.location_id, locations)}</span>
          <button className="danger-inline-button compact-action" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function getLocationLabel(locationId: string | null, locations: WorldLocation[]) {
  const location = locations.find((candidate) => candidate.id === locationId);
  return location ? `${location.name} (${location.location_type})` : "No area set";
}

function getLocationBranchIds(locationId: string, locations: WorldLocation[]) {
  const branchIds = new Set<string>();
  if (!locationId) return branchIds;

  branchIds.add(locationId);
  let didAdd = true;
  while (didAdd) {
    didAdd = false;
    for (const location of locations) {
      if (location.parent_location_id && branchIds.has(location.parent_location_id) && !branchIds.has(location.id)) {
        branchIds.add(location.id);
        didAdd = true;
      }
    }
  }

  return branchIds;
}

function getTypePlaceholder(category: KnowledgeCategory) {
  const placeholders: Record<KnowledgeCategory, string> = {
    Bestiary: "Creature",
    Fauna: "Mount, predator, fish",
    Flora: "Herb, crop, poison",
    Enemies: "Bandit, cultist, soldier",
    Factions: "Guild, kingdom, cult",
    History: "War, era, legend",
    Cultures: "Custom, language, law",
    Magic: "Spell tradition, curse",
    Artifacts: "Relic, weapon, seal",
    Materials: "Ore, wood, reagent",
    Secrets: "Rumor, hidden truth",
  };
  return placeholders[category];
}
