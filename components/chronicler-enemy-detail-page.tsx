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

type EnemyStatusKey = "health" | "stamina" | "mind" | "divinity";
type EnemyAttributeKey = "str" | "spd" | "int" | "cha" | "con" | "dex" | "wis" | "fth";
type EnemyStatus = Record<EnemyStatusKey, string>;
type EnemyAttributes = Record<EnemyAttributeKey, string>;

type EnemyEntry = {
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
  status: EnemyStatus;
  attributes: EnemyAttributes;
  visibility: "chronicler" | "hinted" | "discovered" | "players";
};

const statusKeys: EnemyStatusKey[] = ["health", "stamina", "mind", "divinity"];
const attributeKeys: EnemyAttributeKey[] = ["str", "spd", "int", "cha", "con", "dex", "wis", "fth"];

export function ChroniclerEnemyDetailPage({ enemyId }: { enemyId: string }) {
  const router = useRouter();
  const [enemy, setEnemy] = useState<EnemyEntry | null>(null);
  const [locations, setLocations] = useState<WorldLocation[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const hasLoadedAutoSave = useRef(false);

  const loadEnemy = useCallback(async () => {
    const supabase = createClient();
    const [{ data: enemyData, error: enemyError }, { data: locationData, error: locationError }] = await Promise.all([
      supabase.from("knowledge_entries").select("*").eq("id", enemyId).single(),
      supabase.from("world_locations").select("id,name,location_type").order("name", { ascending: true }),
    ]);

    if (enemyError) {
      setMessage(enemyError.message.includes("status") ? "Run supabase/migrations/023_add_knowledge_entry_combat_stats.sql in Supabase SQL Editor." : enemyError.message);
      setIsLoading(false);
      return;
    }

    if (locationError) {
      setMessage(locationError.message);
      setIsLoading(false);
      return;
    }

    setEnemy(normalizeEnemyEntry(enemyData as Partial<EnemyEntry> & { id: string }));
    setLocations((locationData || []) as WorldLocation[]);
    setIsLoading(false);
  }, [enemyId]);

  useEffect(() => {
    // Enemy records load after the browser Supabase session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadEnemy();
  }, [loadEnemy]);

  useEffect(() => {
    if (!enemy) return;

    if (!hasLoadedAutoSave.current) {
      hasLoadedAutoSave.current = true;
      return;
    }

    const saveTimer = window.setTimeout(async () => {
      const supabase = createClient();
      setMessage("Saving enemy...");

      const { error } = await supabase
        .from("knowledge_entries")
        .update({
          name: enemy.name.trim() || "Unnamed Enemy",
          entry_type: enemy.entry_type,
          image_url: enemy.image_url,
          summary: enemy.summary,
          details: enemy.details,
          strengths: enemy.strengths,
          weaknesses: enemy.weaknesses,
          location_id: enemy.location_ids[0] || enemy.location_id || null,
          location_ids: enemy.location_ids,
          status: enemy.status,
          attributes: enemy.attributes,
          visibility: enemy.visibility,
        })
        .eq("id", enemy.id);

      setMessage(error ? error.message : "Enemy saved.");
    }, 700);

    return () => window.clearTimeout(saveTimer);
  }, [enemy]);

  if (isLoading) return <p className="form-message">Loading enemy...</p>;
  if (!enemy) return <p className="form-message">{message || "Enemy entry not found."}</p>;

  function updateEnemy(patch: Partial<EnemyEntry>) {
    setEnemy((current) => (current ? { ...current, ...patch } : current));
  }

  function addLocation(locationId: string) {
    if (!locationId) return;
    setEnemy((current) => {
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
    setEnemy((current) => {
      if (!current) return current;
      const nextLocationIds = current.location_ids.filter((currentLocationId) => currentLocationId !== locationId);
      return {
        ...current,
        location_id: nextLocationIds[0] || null,
        location_ids: nextLocationIds,
      };
    });
  }

  function updateStatus(statusKey: EnemyStatusKey, value: string) {
    setEnemy((current) =>
      current
        ? {
            ...current,
            status: {
              ...current.status,
              [statusKey]: value,
            },
          }
        : current,
    );
  }

  function updateAttribute(attributeKey: EnemyAttributeKey, value: string) {
    setEnemy((current) =>
      current
        ? {
            ...current,
            attributes: {
              ...current.attributes,
              [attributeKey]: value,
            },
          }
        : current,
    );
  }

  async function deleteEnemy() {
    if (!enemy) return;
    const supabase = createClient();
    setMessage("Deleting enemy...");
    const { error } = await supabase.from("knowledge_entries").delete().eq("id", enemy.id);

    if (error) {
      setMessage(error.message);
      setShowDeleteConfirm(false);
      return;
    }

    router.push("/dm/knowledge?tab=Enemies");
  }

  return (
    <div className="bestiary-detail-page">
      <div className="npc-detail-actions">
        <Link className="secondary-inline-button compact-action" href="/dm/knowledge?tab=Enemies">
          Back to Enemies
        </Link>
        <button className="danger-inline-button compact-action" onClick={() => setShowDeleteConfirm(true)}>
          Delete Enemy
        </button>
        {message ? <span>{message}</span> : null}
      </div>

      <section className="bestiary-book">
        <div className="bestiary-book-page bestiary-book-image-page">
          <div className="bestiary-creature-image" style={enemy.image_url ? { backgroundImage: `url(${enemy.image_url})` } : undefined}>
            {!enemy.image_url ? enemy.name.slice(0, 1).toUpperCase() : null}
          </div>
          <label className="field">
            <span>Image URL</span>
            <input value={enemy.image_url} onChange={(event) => updateEnemy({ image_url: event.target.value })} />
          </label>
          <label className="field">
            <span>Where It Is Found</span>
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
            {enemy.location_ids.map((locationId) => (
              <button type="button" className="tag teal tag-button" key={locationId} onClick={() => removeLocation(locationId)}>
                {getLocationLabel(locationId, locations)} x
              </button>
            ))}
            {enemy.location_ids.length === 0 ? <p className="subcopy">No enemy areas have been added yet.</p> : null}
          </div>
        </div>

        <div className="bestiary-book-page">
          <div className="bestiary-title-grid">
            <label className="field npc-name-field">
              <span>Enemy Name</span>
              <input value={enemy.name} onChange={(event) => updateEnemy({ name: event.target.value })} />
            </label>
            <label className="field">
              <span>Enemy Type</span>
              <input value={enemy.entry_type} onChange={(event) => updateEnemy({ entry_type: event.target.value })} placeholder="Bandit, cultist, soldier" />
            </label>
            <label className="field">
              <span>Visibility</span>
              <select value={enemy.visibility} onChange={(event) => updateEnemy({ visibility: event.target.value as EnemyEntry["visibility"] })}>
                <option value="chronicler">Chronicler Only</option>
                <option value="hinted">Hinted</option>
                <option value="discovered">Discovered</option>
                <option value="players">Player Visible Later</option>
              </select>
            </label>
          </div>

          <label className="field">
            <span>Description</span>
            <textarea value={enemy.details} onChange={(event) => updateEnemy({ details: event.target.value })} />
          </label>

          <label className="field">
            <span>Tactics or Notes</span>
            <textarea value={enemy.summary} onChange={(event) => updateEnemy({ summary: event.target.value })} />
          </label>

          <div className="bestiary-split-notes">
            <label className="field">
              <span>Strengths</span>
              <textarea value={enemy.strengths} onChange={(event) => updateEnemy({ strengths: event.target.value })} />
            </label>
            <label className="field">
              <span>Weaknesses</span>
              <textarea value={enemy.weaknesses} onChange={(event) => updateEnemy({ weaknesses: event.target.value })} />
            </label>
          </div>
        </div>
      </section>

      <section className="bestiary-stat-grid">
        <div className="list-card npc-stat-section">
          <div className="list-header">
            <h3>Status</h3>
          </div>
          <div className="npc-status-grid">
            {statusKeys.map((statusKey) => (
              <div className="npc-status-box" key={statusKey}>
                <strong>{formatLabel(statusKey)}</strong>
                <label>
                  <span>{formatLabel(statusKey)}</span>
                  <input inputMode="numeric" value={enemy.status[statusKey]} onChange={(event) => updateStatus(statusKey, event.target.value)} />
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="list-card npc-stat-section">
          <div className="list-header">
            <h3>Attributes</h3>
          </div>
          <div className="npc-attribute-grid">
            {attributeKeys.map((attributeKey) => (
              <label className="npc-attribute-box" key={attributeKey}>
                <span>{attributeKey.toUpperCase()}</span>
                <input inputMode="numeric" value={enemy.attributes[attributeKey]} onChange={(event) => updateAttribute(attributeKey, event.target.value)} />
              </label>
            ))}
          </div>
        </div>
      </section>

      {showDeleteConfirm ? (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-enemy-title">
          <section className="confirm-dialog">
            <p className="eyebrow">Protected Delete</p>
            <h3 id="delete-enemy-title">Delete {enemy.name}?</h3>
            <p className="subcopy">This will permanently remove this enemy from Chronicler Knowledge, including status, attributes, notes, and area links.</p>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="danger-inline-button" onClick={deleteEnemy}>
                Delete Enemy
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function normalizeEnemyEntry(entry: Partial<EnemyEntry> & { id: string }): EnemyEntry {
  return {
    id: entry.id,
    owner_user_id: entry.owner_user_id || null,
    category_id: entry.category_id || null,
    category: entry.category || "Enemies",
    name: entry.name || "Unnamed Enemy",
    entry_type: entry.entry_type || "",
    image_url: entry.image_url || "",
    summary: entry.summary || "",
    details: entry.details || "",
    strengths: entry.strengths || "",
    weaknesses: entry.weaknesses || "",
    location_id: entry.location_id || null,
    location_ids: normalizeLocationIds(entry.location_ids, entry.location_id),
    status: normalizeStatus(entry.status),
    attributes: {
      ...createBlankAttributes(),
      ...entry.attributes,
    },
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

function createBlankStatus(): EnemyStatus {
  return {
    health: "",
    stamina: "",
    mind: "",
    divinity: "",
  };
}

function normalizeStatus(status: unknown): EnemyStatus {
  const blankStatus = createBlankStatus();
  if (!status || typeof status !== "object") return blankStatus;

  const statusRecord = status as Partial<Record<EnemyStatusKey, string | { current?: string; max?: string }>>;
  return {
    health: getStatusValue(statusRecord.health),
    stamina: getStatusValue(statusRecord.stamina),
    mind: getStatusValue(statusRecord.mind),
    divinity: getStatusValue(statusRecord.divinity),
  };
}

function getStatusValue(value: string | { current?: string; max?: string } | undefined) {
  if (typeof value === "string") return value;
  return value?.current || value?.max || "";
}

function createBlankAttributes(): EnemyAttributes {
  return {
    str: "10",
    spd: "10",
    int: "10",
    cha: "10",
    con: "10",
    dex: "10",
    wis: "10",
    fth: "10",
  };
}

function formatLabel(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
