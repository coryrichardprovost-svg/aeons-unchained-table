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

type KnowledgeCategory = {
  id: string;
  owner_user_id: string | null;
  name: string;
  category_kind: "bestiary" | "generic";
  sort_order: number;
};

type CreatureRecord = {
  id: string;
  owner_user_id: string | null;
  name: string;
  creature_type: string;
  image_url: string;
  description: string;
  origin_location_id: string | null;
  origin_location_ids?: string[];
  strengths: string;
  weaknesses: string;
  status: Partial<Record<"health" | "stamina" | "mind" | "divinity", string | { current?: string; max?: string }>>;
  attributes: Partial<Record<"str" | "spd" | "int" | "cha" | "con" | "dex" | "wis" | "fth", string>>;
  visibility: "chronicler" | "players";
};

type KnowledgeEntry = {
  id: string;
  owner_user_id: string | null;
  category_id: string | null;
  category: string;
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

type PendingDelete =
  | { kind: "category"; category: KnowledgeCategory }
  | null;

const coreKnowledgeSortOrderLimit = 110;

export function ChroniclerKnowledgePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [creatures, setCreatures] = useState<CreatureRecord[]>([]);
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [locations, setLocations] = useState<WorldLocation[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [continentId, setContinentId] = useState("");
  const [regionId, setRegionId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [specificId, setSpecificId] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadKnowledge = useCallback(async () => {
    const supabase = createClient();
    const [
      { data: categoryData, error: categoryError },
      { data: creatureData, error: creatureError },
      { data: entryData, error: entryError },
      { data: locationData, error: locationError },
    ] = await Promise.all([
      supabase.from("knowledge_categories").select("*").order("sort_order", { ascending: true }),
      supabase.from("bestiary_creatures").select("*").order("name", { ascending: true }),
      supabase.from("knowledge_entries").select("*").order("name", { ascending: true }),
      supabase.from("world_locations").select("id,parent_location_id,name,location_type").order("name", { ascending: true }),
    ]);

    if (categoryError) {
      setMessage(categoryError.message.includes("knowledge_categories") ? "Run supabase/migrations/020_add_knowledge_categories.sql in Supabase SQL Editor." : categoryError.message);
      setIsLoading(false);
      return;
    }

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

    const loadedCategories = ((categoryData || []) as KnowledgeCategory[]).sort((first, second) => first.sort_order - second.sort_order || first.name.localeCompare(second.name));
    setCategories(loadedCategories);
    setCreatures((creatureData || []) as CreatureRecord[]);
    setEntries((entryData || []) as KnowledgeEntry[]);
    setLocations((locationData || []) as WorldLocation[]);
    setActiveCategoryId((current) => (current && loadedCategories.some((category) => category.id === current) ? current : loadedCategories[0]?.id || ""));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Knowledge records load after the browser Supabase session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadKnowledge();
  }, [loadKnowledge]);

  const activeCategory = useMemo(() => categories.find((category) => category.id === activeCategoryId) || categories[0] || null, [activeCategoryId, categories]);
  const activeCategoryName = activeCategory?.name || "Knowledge";
  const isBestiaryCategory = activeCategory?.category_kind === "bestiary";
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
      const creatureLocationIds = getCreatureLocationIds(creature);
      const matchesLocation = selectedLocationIds.size === 0 || creatureLocationIds.some((locationId) => selectedLocationIds.has(locationId));
      return matchesSearch && matchesLocation;
    });
  }, [creatures, searchTerm, selectedLocationIds]);

  const filteredEntries = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesCategory = activeCategory ? entry.category_id === activeCategory.id || (!entry.category_id && entry.category === activeCategory.name) : false;
      const matchesSearch =
        !cleanSearch ||
        entry.name.toLowerCase().includes(cleanSearch) ||
        entry.entry_type.toLowerCase().includes(cleanSearch) ||
        entry.summary.toLowerCase().includes(cleanSearch);
      const matchesLocation = selectedLocationIds.size === 0 || (entry.location_id ? selectedLocationIds.has(entry.location_id) : false);
      return matchesCategory && matchesSearch && matchesLocation;
    });
  }, [activeCategory, entries, searchTerm, selectedLocationIds]);

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
        origin_location_ids: selectedLocationId ? [selectedLocationId] : [],
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
    if (!activeCategory) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("knowledge_entries")
      .insert({
        owner_user_id: user?.id,
        category_id: activeCategory.id,
        category: activeCategory.name,
        name: `New ${activeCategory.name} Entry`,
        location_id: selectedLocationId || null,
      })
      .select("*")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setEntries((current) => [data as KnowledgeEntry, ...current]);
    setMessage(`${activeCategory.name} entry created.`);
  }

  async function createCategory() {
    const cleanName = newCategoryName.trim();
    if (!cleanName) return;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const nextSortOrder = Math.max(0, ...categories.map((category) => category.sort_order)) + 10;
    const { data, error } = await supabase
      .from("knowledge_categories")
      .insert({
        owner_user_id: user?.id,
        name: cleanName,
        category_kind: "generic",
        sort_order: nextSortOrder,
      })
      .select("*")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    const createdCategory = data as KnowledgeCategory;
    setCategories((current) => [...current, createdCategory].sort((first, second) => first.sort_order - second.sort_order || first.name.localeCompare(second.name)));
    setActiveCategoryId(createdCategory.id);
    setNewCategoryName("");
    setMessage(`${createdCategory.name} category created.`);
  }

  async function renameCategory(category: KnowledgeCategory) {
    if (isCoreKnowledgeCategory(category)) {
      setMessage(`${category.name} is a core Knowledge tab and cannot be renamed.`);
      setEditingCategoryId("");
      setEditingCategoryName("");
      return;
    }

    const cleanName = editingCategoryName.trim();
    if (!cleanName || cleanName === category.name) {
      setEditingCategoryId("");
      setEditingCategoryName("");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("knowledge_categories").update({ name: cleanName }).eq("id", category.id);
    if (error) {
      setMessage(error.message);
      return;
    }

    await supabase.from("knowledge_entries").update({ category: cleanName }).eq("category_id", category.id);
    setCategories((current) => current.map((candidate) => (candidate.id === category.id ? { ...candidate, name: cleanName } : candidate)));
    setEntries((current) => current.map((entry) => (entry.category_id === category.id ? { ...entry, category: cleanName } : entry)));
    setEditingCategoryId("");
    setEditingCategoryName("");
    setMessage(`${category.name} renamed to ${cleanName}.`);
  }

  async function deleteCategory(category: KnowledgeCategory) {
    if (isCoreKnowledgeCategory(category)) {
      setMessage(`${category.name} is a core Knowledge tab and cannot be deleted.`);
      return;
    }

    const supabase = createClient();
    if (category.category_kind === "generic") {
      const { error: linkedEntryError } = await supabase.from("knowledge_entries").delete().eq("category_id", category.id);
      if (linkedEntryError) {
        setMessage(linkedEntryError.message);
        return;
      }

      const { error: legacyEntryError } = await supabase.from("knowledge_entries").delete().is("category_id", null).eq("category", category.name);
      const entryError = legacyEntryError;
      if (entryError) {
        setMessage(entryError.message);
        return;
      }
    }

    const { error } = await supabase.from("knowledge_categories").delete().eq("id", category.id);
    if (error) {
      setMessage(error.message);
      return;
    }

    const nextCategories = categories.filter((candidate) => candidate.id !== category.id);
    setCategories(nextCategories);
    setEntries((current) => current.filter((entry) => entry.category_id !== category.id && entry.category !== category.name));
    setActiveCategoryId((current) => (current === category.id ? nextCategories[0]?.id || "" : current));
    setMessage(`${category.name} category removed.`);
  }

  async function confirmProtectedDelete() {
    if (!pendingDelete) return;

    if (pendingDelete.kind === "category") {
      await deleteCategory(pendingDelete.category);
    }

    setPendingDelete(null);
  }

  function beginRenameCategory(category: KnowledgeCategory) {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
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
        </div>

        <div className="knowledge-tabs" role="tablist" aria-label="Knowledge sections">
          {categories.map((category) => (
            <div className={`knowledge-tab-shell ${activeCategory?.id === category.id ? "active" : ""}`} key={category.id}>
              {editingCategoryId === category.id ? (
                <input
                  aria-label="Category name"
                  value={editingCategoryName}
                  onChange={(event) => setEditingCategoryName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void renameCategory(category);
                    if (event.key === "Escape") {
                      setEditingCategoryId("");
                      setEditingCategoryName("");
                    }
                  }}
                />
              ) : (
                <button className="knowledge-tab" onClick={() => setActiveCategoryId(category.id)}>
                  {category.name}
                </button>
              )}

              {isCoreKnowledgeCategory(category) ? (
                <span className="knowledge-tab-lock">Core</span>
              ) : (
                <>
                  <button className="knowledge-tab-icon" title="Rename category" onClick={() => (editingCategoryId === category.id ? void renameCategory(category) : beginRenameCategory(category))}>
                    {editingCategoryId === category.id ? "Save" : "Edit"}
                  </button>
                  <button className="knowledge-tab-icon danger" title="Delete category" onClick={() => setPendingDelete({ kind: "category", category })}>
                    Delete
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="knowledge-add-category">
          <label className="field">
            <span>New Knowledge Tab</span>
            <input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="Example: Laws, Prophecies, Languages" />
          </label>
          <button className="secondary-button compact-action" onClick={createCategory}>
            Add Tab
          </button>
        </div>
      </section>

      <section className="list-card knowledge-filter-card">
        <label className="field knowledge-search-field">
          <span>Search {activeCategoryName}</span>
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

      {!activeCategory && !isLoading ? (
        <section className="empty-state">
          <strong>No knowledge tabs yet.</strong>
          <span>Add a tab to start organizing the Chronicler library.</span>
        </section>
      ) : null}

      {isBestiaryCategory ? (
        <section className="knowledge-section">
          <div className="knowledge-section-header">
            <div>
              <h3>{activeCategoryName}</h3>
              <p className="subcopy">Creature entries with status, attributes, strengths, weaknesses, and regional origin.</p>
            </div>
            <button className="primary-inline-button compact-action" onClick={createCreature}>
              New Creature
            </button>
          </div>

          <div className="bestiary-card-grid">
            {filteredCreatures.map((creature) => (
              <article className="bestiary-card" key={creature.id}>
                <Link className="bestiary-card-link" href={`/dm/knowledge/bestiary/${creature.id}`}>
                  <div className="bestiary-card-image" style={creature.image_url ? { backgroundImage: `url(${creature.image_url})` } : undefined}>
                    {!creature.image_url ? creature.name.slice(0, 1).toUpperCase() : null}
                  </div>
                  <div className="bestiary-card-body">
                    <CreatureCardStats creature={creature} />
                    <p>{creature.description || "No creature description yet."}</p>
                    <div className="market-card-meta">
                      <span className="tag teal">{getCreatureLocationLabel(creature, locations)}</span>
                      <span className="tag">{creature.visibility}</span>
                    </div>
                  </div>
                </Link>
              </article>
            ))}

            {!isLoading && filteredCreatures.length === 0 ? (
              <div className="empty-state">
                <strong>No creatures found.</strong>
                <span>Create a creature or clear the search and area filters.</span>
              </div>
            ) : null}
          </div>
        </section>
      ) : activeCategory ? (
        <section className="knowledge-section">
          <div className="knowledge-section-header">
            <div>
              <h3>{activeCategoryName}</h3>
              <p className="subcopy">Area-linked lore entries for this knowledge category.</p>
            </div>
            <button className="primary-inline-button compact-action" onClick={createKnowledgeEntry}>
              New {activeCategoryName}
            </button>
          </div>

          <div className="knowledge-entry-grid">
            {filteredEntries.map((entry) => (
              <KnowledgeEntryCard entry={entry} locations={locations} categoryName={activeCategoryName} onChange={updateEntry} onDelete={() => deleteEntry(entry.id)} key={entry.id} />
            ))}

            {!isLoading && filteredEntries.length === 0 ? (
              <div className="empty-state">
                <strong>No {activeCategoryName.toLowerCase()} entries found.</strong>
                <span>Create an entry or clear the search and area filters.</span>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {pendingDelete ? (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="knowledge-delete-title">
          <section className="confirm-dialog">
            <p className="eyebrow">Protected Delete</p>
            <h3 id="knowledge-delete-title">{getDeleteDialogTitle(pendingDelete)}</h3>
            <p className="subcopy">{getDeleteDialogCopy(pendingDelete)}</p>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={() => setPendingDelete(null)}>
                Cancel
              </button>
              <button className="danger-inline-button" onClick={confirmProtectedDelete}>
                Delete
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function KnowledgeEntryCard({
  entry,
  locations,
  categoryName,
  onChange,
  onDelete,
}: {
  entry: KnowledgeEntry;
  locations: WorldLocation[];
  categoryName: string;
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
          name: localEntry.name.trim() || `Unnamed ${categoryName}`,
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

      onChange({ ...localEntry, name: localEntry.name.trim() || `Unnamed ${categoryName}` });
      setMessage("Saved.");
    }, 650);

    return () => window.clearTimeout(saveTimer);
  }, [categoryName, entry, localEntry, onChange]);

  function patchEntry(patch: Partial<KnowledgeEntry>) {
    setLocalEntry((current) => ({ ...current, ...patch }));
  }

  return (
    <article className="knowledge-entry-card">
      <div className="knowledge-entry-image" style={localEntry.image_url ? { backgroundImage: `url(${localEntry.image_url})` } : undefined}>
        {!localEntry.image_url ? categoryName.slice(0, 1) : null}
      </div>
      <div className="knowledge-entry-body">
        <div className="knowledge-entry-heading">
          <label className="field">
            <span>Name</span>
            <input value={localEntry.name} onChange={(event) => patchEntry({ name: event.target.value })} />
          </label>
          <label className="field">
            <span>Type</span>
            <input value={localEntry.entry_type} onChange={(event) => patchEntry({ entry_type: event.target.value })} placeholder={getTypePlaceholder(categoryName)} />
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

function CreatureCardStats({ creature }: { creature: CreatureRecord }) {
  const statusStats = [
    ["Health", creature.status?.health],
    ["Stamina", creature.status?.stamina],
    ["Mind", creature.status?.mind],
    ["Divinity", creature.status?.divinity],
  ] as const;
  const attributes = ["str", "spd", "int", "cha", "con", "dex", "wis", "fth"] as const;

  return (
    <div className="bestiary-card-stats">
      <div className="bestiary-card-summary-row">
        <div className="bestiary-card-title-block">
          <strong>{creature.name}</strong>
          <span>{creature.creature_type || "Unknown creature type"}</span>
        </div>
        <div className="bestiary-card-status-stack">
          {statusStats.map(([label, value]) => (
            <span key={label}>
              <strong>{label}:</strong>
              {formatStatusValue(value)}
            </span>
          ))}
        </div>
      </div>
      <div className="bestiary-card-attribute-row">
        {attributes.map((attribute) => (
          <span key={attribute}>
            <strong>{attribute.toUpperCase()}</strong>
            {creature.attributes?.[attribute] || "0"}
          </span>
        ))}
      </div>
    </div>
  );
}

function getLocationLabel(locationId: string | null, locations: WorldLocation[]) {
  const location = locations.find((candidate) => candidate.id === locationId);
  return location ? `${location.name} (${location.location_type})` : "No area set";
}

function getCreatureLocationIds(creature: CreatureRecord) {
  const ids = Array.isArray(creature.origin_location_ids) ? creature.origin_location_ids : [];
  if (creature.origin_location_id && !ids.includes(creature.origin_location_id)) return [creature.origin_location_id, ...ids];
  return ids;
}

function getCreatureLocationLabel(creature: CreatureRecord, locations: WorldLocation[]) {
  const originIds = getCreatureLocationIds(creature);
  if (originIds.length === 0) return "No area set";

  const firstLocation = locations.find((candidate) => candidate.id === originIds[0]);
  const firstLabel = firstLocation ? `${firstLocation.name} (${firstLocation.location_type})` : "Unknown area";
  return originIds.length === 1 ? firstLabel : `${firstLabel} +${originIds.length - 1}`;
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

function getTypePlaceholder(categoryName: string) {
  const placeholders: Record<string, string> = {
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
  return placeholders[categoryName] || "Subtype, use, source";
}

function getDeleteDialogTitle(pendingDelete: NonNullable<PendingDelete>) {
  return `Delete ${pendingDelete.category.name} tab?`;
}

function getDeleteDialogCopy(pendingDelete: NonNullable<PendingDelete>) {
  if (pendingDelete.category.category_kind === "bestiary") {
    return "This removes the Bestiary tab from Knowledge. Existing creature records will stay in the database, but the tab will disappear until another Bestiary category is restored.";
  }

  return "This will permanently remove this Knowledge tab and delete the entries stored inside it.";
}

function isCoreKnowledgeCategory(category: KnowledgeCategory) {
  return category.category_kind === "bestiary" || category.sort_order <= coreKnowledgeSortOrderLimit;
}

function formatStatusValue(value: string | { current?: string; max?: string } | undefined) {
  if (typeof value === "string") return value || "0";
  return value?.current || value?.max || "0";
}
