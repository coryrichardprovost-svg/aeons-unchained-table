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

type CultureEntry = {
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

export function ChroniclerCultureDetailPage({ cultureId }: { cultureId: string }) {
  const router = useRouter();
  const [culture, setCulture] = useState<CultureEntry | null>(null);
  const [locations, setLocations] = useState<WorldLocation[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const hasLoadedAutoSave = useRef(false);

  const loadCulture = useCallback(async () => {
    const supabase = createClient();
    const [{ data: cultureData, error: cultureError }, { data: locationData, error: locationError }] = await Promise.all([
      supabase.from("knowledge_entries").select("*").eq("id", cultureId).single(),
      supabase.from("world_locations").select("id,name,location_type").order("name", { ascending: true }),
    ]);

    if (cultureError) {
      setMessage(cultureError.message.includes("knowledge_entries") ? "Run the latest Knowledge migrations in Supabase SQL Editor." : cultureError.message);
      setIsLoading(false);
      return;
    }

    if (locationError) {
      setMessage(locationError.message);
      setIsLoading(false);
      return;
    }

    setCulture(normalizeCultureEntry(cultureData as Partial<CultureEntry> & { id: string }));
    setLocations((locationData || []) as WorldLocation[]);
    setIsLoading(false);
  }, [cultureId]);

  useEffect(() => {
    // Culture records load after the browser Supabase session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCulture();
  }, [loadCulture]);

  useEffect(() => {
    if (!culture) return;

    if (!hasLoadedAutoSave.current) {
      hasLoadedAutoSave.current = true;
      return;
    }

    const saveTimer = window.setTimeout(async () => {
      const supabase = createClient();
      setMessage("Saving culture...");

      const { error } = await supabase
        .from("knowledge_entries")
        .update({
          name: culture.name.trim() || "Unnamed Culture",
          entry_type: culture.entry_type,
          image_url: culture.image_url,
          summary: culture.summary,
          details: culture.details,
          strengths: culture.strengths,
          weaknesses: culture.weaknesses,
          location_id: culture.location_ids[0] || culture.location_id || null,
          location_ids: culture.location_ids,
          environment: culture.environment,
          rarity: culture.rarity,
          visibility: culture.visibility,
        })
        .eq("id", culture.id);

      setMessage(error ? error.message : "Culture saved.");
    }, 700);

    return () => window.clearTimeout(saveTimer);
  }, [culture]);

  if (isLoading) return <p className="form-message">Loading culture...</p>;
  if (!culture) return <p className="form-message">{message || "Culture entry not found."}</p>;

  function updateCulture(patch: Partial<CultureEntry>) {
    setCulture((current) => (current ? { ...current, ...patch } : current));
  }

  function addLocation(locationId: string) {
    if (!locationId) return;
    setCulture((current) => {
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
    setCulture((current) => {
      if (!current) return current;
      const nextLocationIds = current.location_ids.filter((currentLocationId) => currentLocationId !== locationId);
      return {
        ...current,
        location_id: nextLocationIds[0] || null,
        location_ids: nextLocationIds,
      };
    });
  }

  async function deleteCulture() {
    if (!culture) return;
    const supabase = createClient();
    setMessage("Deleting culture...");
    const { error } = await supabase.from("knowledge_entries").delete().eq("id", culture.id);

    if (error) {
      setMessage(error.message);
      setShowDeleteConfirm(false);
      return;
    }

    router.push("/dm/knowledge?tab=Cultures");
  }

  return (
    <div className="culture-detail-page">
      <div className="npc-detail-actions">
        <Link className="secondary-inline-button compact-action" href="/dm/knowledge?tab=Cultures">
          Back to Cultures
        </Link>
        <button className="danger-inline-button compact-action" onClick={() => setShowDeleteConfirm(true)}>
          Delete Culture
        </button>
        {message ? <span>{message}</span> : null}
      </div>

      <section className="culture-codex-hero">
        <aside className="culture-symbol-panel">
          <div className="culture-symbol" style={culture.image_url ? { backgroundImage: `url(${culture.image_url})` } : undefined}>
            {!culture.image_url ? culture.name.slice(0, 1).toUpperCase() : null}
          </div>
          <label className="field">
            <span>Symbol or Art URL</span>
            <input value={culture.image_url} onChange={(event) => updateCulture({ image_url: event.target.value })} />
          </label>
        </aside>

        <div className="culture-codex-main">
          <div className="culture-title-grid">
            <label className="field npc-name-field">
              <span>Culture Name</span>
              <input value={culture.name} onChange={(event) => updateCulture({ name: event.target.value })} />
            </label>
            <label className="field">
              <span>Culture Type</span>
              <input value={culture.entry_type} onChange={(event) => updateCulture({ entry_type: event.target.value })} placeholder="People, nation, faith, city culture" />
            </label>
          </div>

          <div className="culture-stat-grid">
            <label className="field">
              <span>Language or Dialect</span>
              <input value={culture.environment} onChange={(event) => updateCulture({ environment: event.target.value })} placeholder="Common tongue, old dialect" />
            </label>
            <label className="field">
              <span>Tradition or Public Status</span>
              <input value={culture.rarity} onChange={(event) => updateCulture({ rarity: event.target.value })} placeholder="Nomadic, hidden, imperial, sacred" />
            </label>
            <label className="field">
              <span>Visibility</span>
              <select value={culture.visibility} onChange={(event) => updateCulture({ visibility: event.target.value as CultureEntry["visibility"] })}>
                <option value="chronicler">Chronicler Only</option>
                <option value="hinted">Hinted</option>
                <option value="discovered">Discovered</option>
                <option value="players">Player Visible Later</option>
              </select>
            </label>
          </div>

          <label className="field">
            <span>Homelands or Known Regions</span>
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
            {culture.location_ids.map((locationId) => (
              <button type="button" className="tag teal tag-button" key={locationId} onClick={() => removeLocation(locationId)}>
                {getLocationLabel(locationId, locations)} x
              </button>
            ))}
            {culture.location_ids.length === 0 ? <p className="subcopy">No homelands or regions have been linked yet.</p> : null}
          </div>
        </div>
      </section>

      <section className="culture-codex-grid">
        <label className="field list-card culture-codex-card">
          <span>Overview</span>
          <textarea value={culture.summary} onChange={(event) => updateCulture({ summary: event.target.value })} />
        </label>
        <label className="field list-card culture-codex-card">
          <span>Customs and Daily Life</span>
          <textarea value={culture.details} onChange={(event) => updateCulture({ details: event.target.value })} />
        </label>
        <label className="field list-card culture-codex-card">
          <span>Laws, Values, and Social Structure</span>
          <textarea value={culture.strengths} onChange={(event) => updateCulture({ strengths: event.target.value })} />
        </label>
        <label className="field list-card culture-codex-card">
          <span>Taboos, Tensions, and Hidden Truths</span>
          <textarea value={culture.weaknesses} onChange={(event) => updateCulture({ weaknesses: event.target.value })} />
        </label>
      </section>

      {showDeleteConfirm ? (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-culture-title">
          <section className="confirm-dialog">
            <p className="eyebrow">Protected Delete</p>
            <h3 id="delete-culture-title">Delete {culture.name}?</h3>
            <p className="subcopy">This will permanently remove this culture from Chronicler Knowledge.</p>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="danger-inline-button" onClick={deleteCulture}>
                Delete Culture
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function normalizeCultureEntry(entry: Partial<CultureEntry> & { id: string }): CultureEntry {
  return {
    id: entry.id,
    owner_user_id: entry.owner_user_id || null,
    category_id: entry.category_id || null,
    category: entry.category || "Cultures",
    name: entry.name || "Unnamed Culture",
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
