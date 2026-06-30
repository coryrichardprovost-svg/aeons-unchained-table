"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type WorldLocation = {
  id: string;
  name: string;
  location_type: string;
};

type NatureEntryKind = "Fauna" | "Flora";

type NatureEntry = {
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
  location_ids: string[];
  environment: string;
  rarity: string;
  visibility: "chronicler" | "hinted" | "discovered" | "players";
};

export function ChroniclerFaunaDetailPage({ faunaId }: { faunaId: string }) {
  return <ChroniclerNatureDetailPage entryId={faunaId} kind="Fauna" />;
}

export function ChroniclerFloraDetailPage({ floraId }: { floraId: string }) {
  return <ChroniclerNatureDetailPage entryId={floraId} kind="Flora" />;
}

function ChroniclerNatureDetailPage({ entryId, kind }: { entryId: string; kind: NatureEntryKind }) {
  const router = useRouter();
  const config = getNatureEntryConfig(kind);
  const [entry, setEntry] = useState<NatureEntry | null>(null);
  const [locations, setLocations] = useState<WorldLocation[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const hasLoadedAutoSave = useRef(false);

  const loadFauna = useCallback(async () => {
    const supabase = createClient();
    const [{ data: entryData, error: entryError }, { data: locationData, error: locationError }] = await Promise.all([
      supabase.from("knowledge_entries").select("*").eq("id", entryId).single(),
      supabase.from("world_locations").select("id,name,location_type").order("name", { ascending: true }),
    ]);

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

    setEntry(normalizeNatureEntry(entryData as Partial<NatureEntry> & { id: string }, kind));
    setLocations((locationData || []) as WorldLocation[]);
    setIsLoading(false);
  }, [entryId, kind]);

  useEffect(() => {
    // Nature records load after the browser Supabase session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFauna();
  }, [loadFauna]);

  useEffect(() => {
    if (!entry) return;

    if (!hasLoadedAutoSave.current) {
      hasLoadedAutoSave.current = true;
      return;
    }

    const saveTimer = window.setTimeout(async () => {
      const supabase = createClient();
      setMessage(`Saving ${config.lowerName}...`);

      const { error } = await supabase
        .from("knowledge_entries")
        .update({
          name: entry.name.trim() || `Unnamed ${kind}`,
          entry_type: entry.entry_type,
          image_url: entry.image_url,
          summary: entry.summary,
          details: entry.details,
          location_id: entry.location_ids[0] || entry.location_id || null,
          location_ids: entry.location_ids,
          environment: entry.environment,
          rarity: entry.rarity,
          visibility: entry.visibility,
        })
        .eq("id", entry.id);

      setMessage(error ? error.message : `${kind} saved.`);
    }, 700);

    return () => window.clearTimeout(saveTimer);
  }, [config.lowerName, entry, kind]);

  if (isLoading) return <p className="form-message">Loading {config.lowerName}...</p>;
  if (!entry) return <p className="form-message">{message || `${kind} entry not found.`}</p>;

  function updateEntry(patch: Partial<NatureEntry>) {
    setEntry((current) => (current ? { ...current, ...patch } : current));
  }

  function addLocation(locationId: string) {
    if (!locationId) return;
    setEntry((current) => {
      if (!current) return current;
      const nextLocationIds = Array.from(new Set([...current.location_ids, locationId]));
      return {
        ...current,
        location_id: current.location_id || locationId,
        location_ids: nextLocationIds,
      };
    });
  }

  function removeLocation(locationId: string) {
    setEntry((current) => {
      if (!current) return current;
      const nextLocationIds = current.location_ids.filter((currentLocationId) => currentLocationId !== locationId);
      return {
        ...current,
        location_id: nextLocationIds[0] || null,
        location_ids: nextLocationIds,
      };
    });
  }

  async function deleteNatureEntry() {
    if (!entry) return;
    const supabase = createClient();
    setMessage(`Deleting ${config.lowerName}...`);
    const { error } = await supabase.from("knowledge_entries").delete().eq("id", entry.id);

    if (error) {
      setMessage(error.message);
      setShowDeleteConfirm(false);
      return;
    }

    router.push(config.returnHref);
  }

  return (
    <div className="bestiary-detail-page">
      <div className="npc-detail-actions">
        <Link className="secondary-inline-button compact-action" href={config.returnHref}>
          Back to {kind}
        </Link>
        <button className="danger-inline-button compact-action" onClick={() => setShowDeleteConfirm(true)}>
          Delete {kind}
        </button>
        {message ? <span>{message}</span> : null}
      </div>

      <section className="fauna-detail-book">
        <div className="bestiary-book-page bestiary-book-image-page">
          <div className="bestiary-creature-image" style={entry.image_url ? { backgroundImage: `url(${entry.image_url})` } : undefined}>
            {!entry.image_url ? entry.name.slice(0, 1).toUpperCase() : null}
          </div>
          <label className="field">
            <span>Image URL</span>
            <input value={entry.image_url} onChange={(event) => updateEntry({ image_url: event.target.value })} />
          </label>
          <label className="field">
            <span>Regions or Areas</span>
            <select value="" onChange={(event) => addLocation(event.target.value)}>
              <option value="">Add area</option>
              {locations.map((location) => (
                <option value={location.id} key={location.id}>
                  {location.name} ({location.location_type})
                </option>
              ))}
            </select>
          </label>
          <div className="bestiary-origin-chip-list">
            {entry.location_ids.map((locationId) => (
              <button type="button" className="tag teal tag-button" onClick={() => removeLocation(locationId)} key={locationId}>
                {getLocationLabel(locationId, locations)} x
              </button>
            ))}
            {entry.location_ids.length === 0 ? <p className="subcopy">No {config.lowerName} areas have been added yet.</p> : null}
          </div>
        </div>

        <div className="bestiary-book-page">
          <div className="fauna-detail-title-grid">
            <label className="field npc-name-field">
              <span>{kind} Name</span>
              <input value={entry.name} onChange={(event) => updateEntry({ name: event.target.value })} />
            </label>
            <label className="field">
              <span>Type</span>
              <input value={entry.entry_type} onChange={(event) => updateEntry({ entry_type: event.target.value })} placeholder={config.typePlaceholder} />
            </label>
          </div>

          <div className="fauna-detail-small-grid">
            <label className="field">
              <span>Environment</span>
              <input value={entry.environment} onChange={(event) => updateEntry({ environment: event.target.value })} />
            </label>
            <label className="field">
              <span>Rarity</span>
              <input value={entry.rarity} onChange={(event) => updateEntry({ rarity: event.target.value })} />
            </label>
            <label className="field">
              <span>Visibility</span>
              <select value={entry.visibility} onChange={(event) => updateEntry({ visibility: event.target.value as NatureEntry["visibility"] })}>
                <option value="chronicler">Chronicler Only</option>
                <option value="hinted">Hinted</option>
                <option value="discovered">Discovered</option>
                <option value="players">Player Visible Later</option>
              </select>
            </label>
          </div>

          <label className="field">
            <span>Short Field Note</span>
            <textarea value={entry.summary} onChange={(event) => updateEntry({ summary: event.target.value })} />
          </label>

          <label className="field">
            <span>Detailed {kind} Notes</span>
            <textarea value={entry.details} onChange={(event) => updateEntry({ details: event.target.value })} />
          </label>
        </div>
      </section>

      {showDeleteConfirm ? (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-nature-title">
          <section className="confirm-dialog">
            <p className="eyebrow">Protected Delete</p>
            <h3 id="delete-nature-title">Delete {entry.name}?</h3>
            <p className="subcopy">This will permanently remove this {config.lowerName} entry from Chronicler Knowledge.</p>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="danger-inline-button" onClick={deleteNatureEntry}>
                Delete {kind}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function normalizeNatureEntry(entry: Partial<NatureEntry> & { id: string }, kind: NatureEntryKind): NatureEntry {
  return {
    id: entry.id,
    owner_user_id: entry.owner_user_id || null,
    category_id: entry.category_id || null,
    category: entry.category || kind,
    name: entry.name || `Unnamed ${kind}`,
    entry_type: entry.entry_type || "",
    image_url: entry.image_url || "",
    summary: entry.summary || "",
    details: entry.details || "",
    location_id: entry.location_id || null,
    location_ids: normalizeLocationIds(entry.location_ids, entry.location_id),
    environment: entry.environment || "",
    rarity: entry.rarity || "",
    visibility: entry.visibility || "chronicler",
  };
}

function getNatureEntryConfig(kind: NatureEntryKind) {
  return {
    lowerName: kind.toLowerCase(),
    returnHref: `/dm/knowledge?tab=${kind}`,
    typePlaceholder: kind === "Fauna" ? "Mount, predator, fish" : "Herb, crop, poison",
  };
}

function normalizeLocationIds(locationIds: unknown, locationId?: string | null) {
  const ids = Array.isArray(locationIds) ? locationIds.filter((id): id is string => typeof id === "string" && Boolean(id)) : [];
  if (locationId && !ids.includes(locationId)) return [locationId, ...ids];
  return ids;
}

function getLocationLabel(locationId: string, locations: WorldLocation[]) {
  const location = locations.find((candidate) => candidate.id === locationId);
  return location ? `${location.name} (${location.location_type})` : "Unknown area";
}
