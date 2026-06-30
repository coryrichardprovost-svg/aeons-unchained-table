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

type FactionEntry = {
  id: string;
  owner_user_id: string | null;
  category_id: string | null;
  category: string;
  name: string;
  entry_type: string;
  image_url: string;
  summary: string;
  details: string;
  strengths: string;
  weaknesses: string;
  location_id: string | null;
  location_ids: string[];
  environment: string;
  rarity: string;
  visibility: "chronicler" | "hinted" | "discovered" | "players";
};

export function ChroniclerFactionDetailPage({ factionId }: { factionId: string }) {
  const router = useRouter();
  const [faction, setFaction] = useState<FactionEntry | null>(null);
  const [locations, setLocations] = useState<WorldLocation[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const hasLoadedAutoSave = useRef(false);

  const loadFaction = useCallback(async () => {
    const supabase = createClient();
    const [{ data: factionData, error: factionError }, { data: locationData, error: locationError }] = await Promise.all([
      supabase.from("knowledge_entries").select("*").eq("id", factionId).single(),
      supabase.from("world_locations").select("id,name,location_type").order("name", { ascending: true }),
    ]);

    if (factionError) {
      setMessage(factionError.message.includes("knowledge_entries") ? "Run the latest Knowledge migrations in Supabase SQL Editor." : factionError.message);
      setIsLoading(false);
      return;
    }

    if (locationError) {
      setMessage(locationError.message);
      setIsLoading(false);
      return;
    }

    setFaction(normalizeFactionEntry(factionData as Partial<FactionEntry> & { id: string }));
    setLocations((locationData || []) as WorldLocation[]);
    setIsLoading(false);
  }, [factionId]);

  useEffect(() => {
    // Faction records load after the browser Supabase session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFaction();
  }, [loadFaction]);

  useEffect(() => {
    if (!faction) return;

    if (!hasLoadedAutoSave.current) {
      hasLoadedAutoSave.current = true;
      return;
    }

    const saveTimer = window.setTimeout(async () => {
      const supabase = createClient();
      setMessage("Saving faction...");

      const { error } = await supabase
        .from("knowledge_entries")
        .update({
          name: faction.name.trim() || "Unnamed Faction",
          entry_type: faction.entry_type,
          image_url: faction.image_url,
          summary: faction.summary,
          details: faction.details,
          strengths: faction.strengths,
          weaknesses: faction.weaknesses,
          location_id: faction.location_ids[0] || faction.location_id || null,
          location_ids: faction.location_ids,
          environment: faction.environment,
          rarity: faction.rarity,
          visibility: faction.visibility,
        })
        .eq("id", faction.id);

      setMessage(error ? error.message : "Faction saved.");
    }, 700);

    return () => window.clearTimeout(saveTimer);
  }, [faction]);

  if (isLoading) return <p className="form-message">Loading faction...</p>;
  if (!faction) return <p className="form-message">{message || "Faction entry not found."}</p>;

  function updateFaction(patch: Partial<FactionEntry>) {
    setFaction((current) => (current ? { ...current, ...patch } : current));
  }

  function addLocation(locationId: string) {
    if (!locationId) return;
    setFaction((current) => {
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
    setFaction((current) => {
      if (!current) return current;
      const nextLocationIds = current.location_ids.filter((currentLocationId) => currentLocationId !== locationId);
      return {
        ...current,
        location_id: nextLocationIds[0] || null,
        location_ids: nextLocationIds,
      };
    });
  }

  async function deleteFaction() {
    if (!faction) return;
    const supabase = createClient();
    setMessage("Deleting faction...");
    const { error } = await supabase.from("knowledge_entries").delete().eq("id", faction.id);

    if (error) {
      setMessage(error.message);
      setShowDeleteConfirm(false);
      return;
    }

    router.push("/dm/knowledge?tab=Factions");
  }

  return (
    <div className="faction-detail-page">
      <div className="npc-detail-actions">
        <Link className="secondary-inline-button compact-action" href="/dm/knowledge?tab=Factions">
          Back to Factions
        </Link>
        <button className="danger-inline-button compact-action" onClick={() => setShowDeleteConfirm(true)}>
          Delete Faction
        </button>
        {message ? <span>{message}</span> : null}
      </div>

      <section className="faction-dossier-hero">
        <div className="faction-emblem-panel">
          <div className="faction-emblem" style={faction.image_url ? { backgroundImage: `url(${faction.image_url})` } : undefined}>
            {!faction.image_url ? faction.name.slice(0, 1).toUpperCase() : null}
          </div>
          <label className="field">
            <span>Emblem or Banner URL</span>
            <input value={faction.image_url} onChange={(event) => updateFaction({ image_url: event.target.value })} />
          </label>
        </div>

        <div className="faction-dossier-main">
          <div className="faction-title-grid">
            <label className="field npc-name-field">
              <span>Faction Name</span>
              <input value={faction.name} onChange={(event) => updateFaction({ name: event.target.value })} />
            </label>
            <label className="field">
              <span>Faction Type</span>
              <input value={faction.entry_type} onChange={(event) => updateFaction({ entry_type: event.target.value })} placeholder="Guild, kingdom, cult" />
            </label>
          </div>

          <div className="faction-stat-grid">
            <label className="field">
              <span>Influence</span>
              <input value={faction.environment} onChange={(event) => updateFaction({ environment: event.target.value })} placeholder="Local, regional, continental" />
            </label>
            <label className="field">
              <span>Status</span>
              <input value={faction.rarity} onChange={(event) => updateFaction({ rarity: event.target.value })} placeholder="Ally, enemy, hidden, unknown" />
            </label>
            <label className="field">
              <span>Visibility</span>
              <select value={faction.visibility} onChange={(event) => updateFaction({ visibility: event.target.value as FactionEntry["visibility"] })}>
                <option value="chronicler">Chronicler Only</option>
                <option value="hinted">Hinted</option>
                <option value="discovered">Discovered</option>
                <option value="players">Player Visible Later</option>
              </select>
            </label>
          </div>

          <label className="field">
            <span>Linked Territories or Headquarters</span>
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
            {faction.location_ids.map((locationId) => (
              <button type="button" className="tag teal tag-button" key={locationId} onClick={() => removeLocation(locationId)}>
                {getLocationLabel(locationId, locations)} x
              </button>
            ))}
            {faction.location_ids.length === 0 ? <p className="subcopy">No faction areas have been added yet.</p> : null}
          </div>
        </div>
      </section>

      <section className="faction-dossier-grid">
        <label className="field list-card faction-dossier-card">
          <span>Overview and History</span>
          <textarea value={faction.details} onChange={(event) => updateFaction({ details: event.target.value })} />
        </label>
        <label className="field list-card faction-dossier-card">
          <span>Player Knowledge</span>
          <textarea value={faction.summary} onChange={(event) => updateFaction({ summary: event.target.value })} />
        </label>
        <label className="field list-card faction-dossier-card">
          <span>Goals and Methods</span>
          <textarea value={faction.strengths} onChange={(event) => updateFaction({ strengths: event.target.value })} />
        </label>
        <label className="field list-card faction-dossier-card">
          <span>Secrets and Chronicler Notes</span>
          <textarea value={faction.weaknesses} onChange={(event) => updateFaction({ weaknesses: event.target.value })} />
        </label>
      </section>

      {showDeleteConfirm ? (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-faction-title">
          <section className="confirm-dialog">
            <p className="eyebrow">Protected Delete</p>
            <h3 id="delete-faction-title">Delete {faction.name}?</h3>
            <p className="subcopy">This will permanently remove this faction dossier from Chronicler Knowledge.</p>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="danger-inline-button" onClick={deleteFaction}>
                Delete Faction
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function normalizeFactionEntry(entry: Partial<FactionEntry> & { id: string }): FactionEntry {
  return {
    id: entry.id,
    owner_user_id: entry.owner_user_id || null,
    category_id: entry.category_id || null,
    category: entry.category || "Factions",
    name: entry.name || "Unnamed Faction",
    entry_type: entry.entry_type || "",
    image_url: entry.image_url || "",
    summary: entry.summary || "",
    details: entry.details || "",
    strengths: entry.strengths || "",
    weaknesses: entry.weaknesses || "",
    location_id: entry.location_id || null,
    location_ids: normalizeLocationIds(entry.location_ids, entry.location_id),
    environment: entry.environment || "",
    rarity: entry.rarity || "",
    visibility: entry.visibility || "chronicler",
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
