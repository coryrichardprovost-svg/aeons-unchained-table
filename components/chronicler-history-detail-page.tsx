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

type HistoryEntry = {
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

export function ChroniclerHistoryDetailPage({ historyId }: { historyId: string }) {
  const router = useRouter();
  const [entry, setEntry] = useState<HistoryEntry | null>(null);
  const [locations, setLocations] = useState<WorldLocation[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const hasLoadedAutoSave = useRef(false);

  const loadHistory = useCallback(async () => {
    const supabase = createClient();
    const [{ data: entryData, error: entryError }, { data: locationData, error: locationError }] = await Promise.all([
      supabase.from("knowledge_entries").select("*").eq("id", historyId).single(),
      supabase.from("world_locations").select("id,name,location_type").order("name", { ascending: true }),
    ]);

    if (entryError) {
      setMessage(entryError.message.includes("knowledge_entries") ? "Run the latest Knowledge migrations in Supabase SQL Editor." : entryError.message);
      setIsLoading(false);
      return;
    }

    if (locationError) {
      setMessage(locationError.message);
      setIsLoading(false);
      return;
    }

    setEntry(normalizeHistoryEntry(entryData as Partial<HistoryEntry> & { id: string }));
    setLocations((locationData || []) as WorldLocation[]);
    setIsLoading(false);
  }, [historyId]);

  useEffect(() => {
    // Chronicle records load after the browser Supabase session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!entry) return;

    if (!hasLoadedAutoSave.current) {
      hasLoadedAutoSave.current = true;
      return;
    }

    const saveTimer = window.setTimeout(async () => {
      const supabase = createClient();
      setMessage("Saving chronicle...");

      const { error } = await supabase
        .from("knowledge_entries")
        .update({
          name: entry.name.trim() || "Unnamed Chronicle",
          entry_type: entry.entry_type,
          image_url: entry.image_url,
          summary: entry.summary,
          details: entry.details,
          strengths: entry.strengths,
          weaknesses: entry.weaknesses,
          location_id: entry.location_ids[0] || entry.location_id || null,
          location_ids: entry.location_ids,
          environment: entry.environment,
          rarity: entry.rarity,
          visibility: entry.visibility,
        })
        .eq("id", entry.id);

      setMessage(error ? error.message : "Chronicle saved.");
    }, 700);

    return () => window.clearTimeout(saveTimer);
  }, [entry]);

  if (isLoading) return <p className="form-message">Loading chronicle...</p>;
  if (!entry) return <p className="form-message">{message || "Chronicle entry not found."}</p>;

  function updateEntry(patch: Partial<HistoryEntry>) {
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

  async function deleteHistory() {
    if (!entry) return;
    const supabase = createClient();
    setMessage("Deleting chronicle...");
    const { error } = await supabase.from("knowledge_entries").delete().eq("id", entry.id);

    if (error) {
      setMessage(error.message);
      setShowDeleteConfirm(false);
      return;
    }

    router.push("/dm/knowledge?tab=History");
  }

  return (
    <div className="history-detail-page">
      <div className="npc-detail-actions">
        <Link className="secondary-inline-button compact-action" href="/dm/knowledge?tab=History">
          Back to History
        </Link>
        <button className="danger-inline-button compact-action" onClick={() => setShowDeleteConfirm(true)}>
          Delete Chronicle
        </button>
        {message ? <span>{message}</span> : null}
      </div>

      <section className="history-editor-shell">
        <aside className="history-editor-sidebar">
          <div className="list-header">
            <h3>Archive Index</h3>
            <span className="tag gold">{entry.visibility}</span>
          </div>
          <label className="field">
            <span>Collection or Type</span>
            <input value={entry.entry_type} onChange={(event) => updateEntry({ entry_type: event.target.value })} placeholder="Realm, era, war, legend" />
          </label>
          <label className="field">
            <span>Era or Date</span>
            <input value={entry.environment} onChange={(event) => updateEntry({ environment: event.target.value })} placeholder="Before Strings, 3A 421" />
          </label>
          <label className="field">
            <span>Archive Shelf</span>
            <input value={entry.rarity} onChange={(event) => updateEntry({ rarity: event.target.value })} placeholder="World History, Realm, Religion" />
          </label>
          <label className="field">
            <span>Visibility</span>
            <select value={entry.visibility} onChange={(event) => updateEntry({ visibility: event.target.value as HistoryEntry["visibility"] })}>
              <option value="chronicler">Chronicler Only</option>
              <option value="hinted">Hinted</option>
              <option value="discovered">Discovered</option>
              <option value="players">Player Visible Later</option>
            </select>
          </label>
          <label className="field">
            <span>Linked Places</span>
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
              <button type="button" className="tag teal tag-button" key={locationId} onClick={() => removeLocation(locationId)}>
                {getLocationLabel(locationId, locations)} x
              </button>
            ))}
            {entry.location_ids.length === 0 ? <p className="subcopy">No places have been linked yet.</p> : null}
          </div>
        </aside>

        <main className="history-writing-page">
          <label className="field history-title-field">
            <span>Chronicle Title</span>
            <input value={entry.name} onChange={(event) => updateEntry({ name: event.target.value })} />
          </label>
          <label className="field">
            <span>Dashboard Summary</span>
            <textarea value={entry.summary} onChange={(event) => updateEntry({ summary: event.target.value })} />
          </label>
          <label className="field history-body-field">
            <span>Full Chronicle</span>
            <textarea value={entry.details} onChange={(event) => updateEntry({ details: event.target.value })} />
          </label>
        </main>
      </section>

      <section className="history-notes-grid">
        <label className="field list-card history-note-card">
          <span>Chronicler Notes and Hidden Truths</span>
          <textarea value={entry.strengths} onChange={(event) => updateEntry({ strengths: event.target.value })} />
        </label>
        <label className="field list-card history-note-card">
          <span>Player-Known Version</span>
          <textarea value={entry.weaknesses} onChange={(event) => updateEntry({ weaknesses: event.target.value })} />
        </label>
      </section>

      {showDeleteConfirm ? (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-history-title">
          <section className="confirm-dialog">
            <p className="eyebrow">Protected Delete</p>
            <h3 id="delete-history-title">Delete {entry.name}?</h3>
            <p className="subcopy">This will permanently remove this chronicle from the History archive.</p>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="danger-inline-button" onClick={deleteHistory}>
                Delete Chronicle
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function normalizeHistoryEntry(entry: Partial<HistoryEntry> & { id: string }): HistoryEntry {
  return {
    id: entry.id,
    owner_user_id: entry.owner_user_id || null,
    category_id: entry.category_id || null,
    category: entry.category || "History",
    name: entry.name || "Unnamed Chronicle",
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
