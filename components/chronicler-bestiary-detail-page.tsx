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

type CreatureStatusKey = "health" | "stamina" | "mind" | "divinity";
type CreatureAttributeKey = "str" | "spd" | "int" | "cha" | "con" | "dex" | "wis" | "fth";
type CreatureStatus = Record<CreatureStatusKey, { current: string; max: string }>;
type CreatureAttributes = Record<CreatureAttributeKey, string>;

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
  status: CreatureStatus;
  attributes: CreatureAttributes;
  visibility: "chronicler" | "players";
};

const statusKeys: CreatureStatusKey[] = ["health", "stamina", "mind", "divinity"];
const attributeKeys: CreatureAttributeKey[] = ["str", "spd", "int", "cha", "con", "dex", "wis", "fth"];

export function ChroniclerBestiaryDetailPage({ creatureId }: { creatureId: string }) {
  const router = useRouter();
  const [creature, setCreature] = useState<CreatureRecord | null>(null);
  const [locations, setLocations] = useState<WorldLocation[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const hasLoadedAutoSave = useRef(false);

  const loadCreature = useCallback(async () => {
    const supabase = createClient();
    const [{ data: creatureData, error: creatureError }, { data: locationData, error: locationError }] = await Promise.all([
      supabase.from("bestiary_creatures").select("*").eq("id", creatureId).single(),
      supabase.from("world_locations").select("id,name,location_type").order("name", { ascending: true }),
    ]);

    if (creatureError) {
      setMessage(creatureError.message.includes("bestiary_creatures") ? "Run supabase/migrations/016_add_bestiary.sql in Supabase SQL Editor." : creatureError.message);
      setIsLoading(false);
      return;
    }

    if (locationError) {
      setMessage(locationError.message);
      setIsLoading(false);
      return;
    }

    setCreature(normalizeCreature(creatureData as Partial<CreatureRecord> & { id: string }));
    setLocations((locationData || []) as WorldLocation[]);
    setIsLoading(false);
  }, [creatureId]);

  useEffect(() => {
    // Creature records load after the browser Supabase session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCreature();
  }, [loadCreature]);

  useEffect(() => {
    if (!creature) return;

    if (!hasLoadedAutoSave.current) {
      hasLoadedAutoSave.current = true;
      return;
    }

    const saveTimer = window.setTimeout(async () => {
      const supabase = createClient();
      setMessage("Saving creature...");

      const { error } = await supabase
        .from("bestiary_creatures")
        .update({
          name: creature.name.trim() || "Unnamed Creature",
          creature_type: creature.creature_type,
          image_url: creature.image_url,
          description: creature.description,
          origin_location_id: creature.origin_location_id || null,
          strengths: creature.strengths,
          weaknesses: creature.weaknesses,
          status: creature.status,
          attributes: creature.attributes,
          visibility: creature.visibility,
        })
        .eq("id", creature.id);

      setMessage(error ? error.message : "Creature saved.");
    }, 700);

    return () => window.clearTimeout(saveTimer);
  }, [creature]);

  if (isLoading) return <p className="form-message">Loading creature...</p>;
  if (!creature) return <p className="form-message">{message || "Creature not found."}</p>;

  function updateCreature(patch: Partial<CreatureRecord>) {
    setCreature((current) => (current ? { ...current, ...patch } : current));
  }

  function updateStatus(statusKey: CreatureStatusKey, field: "current" | "max", value: string) {
    setCreature((current) =>
      current
        ? {
            ...current,
            status: {
              ...current.status,
              [statusKey]: {
                ...current.status[statusKey],
                [field]: value,
              },
            },
          }
        : current,
    );
  }

  function updateAttribute(attributeKey: CreatureAttributeKey, value: string) {
    setCreature((current) =>
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

  async function deleteCreature() {
    if (!creature) return;
    const supabase = createClient();
    setMessage("Deleting creature...");
    const { error } = await supabase.from("bestiary_creatures").delete().eq("id", creature.id);

    if (error) {
      setMessage(error.message);
      setShowDeleteConfirm(false);
      return;
    }

    router.push("/dm/knowledge");
  }

  return (
    <div className="bestiary-detail-page">
      <div className="npc-detail-actions">
        <Link className="secondary-inline-button compact-action" href="/dm/knowledge">
          Back to Knowledge
        </Link>
        <button className="danger-inline-button compact-action" onClick={() => setShowDeleteConfirm(true)}>
          Delete Creature
        </button>
        {message ? <span>{message}</span> : null}
      </div>

      <section className="bestiary-book">
        <div className="bestiary-book-page bestiary-book-image-page">
          <div className="bestiary-creature-image" style={creature.image_url ? { backgroundImage: `url(${creature.image_url})` } : undefined}>
            {!creature.image_url ? creature.name.slice(0, 1).toUpperCase() : null}
          </div>
          <label className="field">
            <span>Image URL</span>
            <input value={creature.image_url} onChange={(event) => updateCreature({ image_url: event.target.value })} />
          </label>
          <label className="field">
            <span>Where It Is From</span>
            <select value={creature.origin_location_id || ""} onChange={(event) => updateCreature({ origin_location_id: event.target.value || null })}>
              <option value="">No origin</option>
              {locations.map((location) => (
                <option value={location.id} key={location.id}>
                  {location.name} ({location.location_type})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="bestiary-book-page">
          <div className="bestiary-title-grid">
            <label className="field npc-name-field">
              <span>Creature Name</span>
              <input value={creature.name} onChange={(event) => updateCreature({ name: event.target.value })} />
            </label>
            <label className="field">
              <span>Creature Type</span>
              <input value={creature.creature_type} onChange={(event) => updateCreature({ creature_type: event.target.value })} />
            </label>
            <label className="field">
              <span>Visibility</span>
              <select value={creature.visibility} onChange={(event) => updateCreature({ visibility: event.target.value as CreatureRecord["visibility"] })}>
                <option value="chronicler">Chronicler Only</option>
                <option value="players">Player Visible Later</option>
              </select>
            </label>
          </div>

          <label className="field">
            <span>Description</span>
            <textarea value={creature.description} onChange={(event) => updateCreature({ description: event.target.value })} />
          </label>

          <div className="bestiary-split-notes">
            <label className="field">
              <span>Strengths</span>
              <textarea value={creature.strengths} onChange={(event) => updateCreature({ strengths: event.target.value })} />
            </label>
            <label className="field">
              <span>Weaknesses</span>
              <textarea value={creature.weaknesses} onChange={(event) => updateCreature({ weaknesses: event.target.value })} />
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
                  <span>Current</span>
                  <input value={creature.status[statusKey].current} onChange={(event) => updateStatus(statusKey, "current", event.target.value)} />
                </label>
                <label>
                  <span>Max</span>
                  <input value={creature.status[statusKey].max} onChange={(event) => updateStatus(statusKey, "max", event.target.value)} />
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
                <input value={creature.attributes[attributeKey]} onChange={(event) => updateAttribute(attributeKey, event.target.value)} />
              </label>
            ))}
          </div>
        </div>
      </section>

      {showDeleteConfirm ? (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-creature-title">
          <section className="confirm-dialog">
            <p className="eyebrow">Protected Delete</p>
            <h3 id="delete-creature-title">Delete {creature.name}?</h3>
            <p className="subcopy">This will permanently remove this creature from the Bestiary, including its status, attributes, notes, and origin link.</p>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="danger-inline-button" onClick={deleteCreature}>
                Delete Creature
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function normalizeCreature(creature: Partial<CreatureRecord> & { id: string }): CreatureRecord {
  return {
    id: creature.id,
    owner_user_id: creature.owner_user_id || null,
    name: creature.name || "Unnamed Creature",
    creature_type: creature.creature_type || "",
    image_url: creature.image_url || "",
    description: creature.description || "",
    origin_location_id: creature.origin_location_id || null,
    strengths: creature.strengths || "",
    weaknesses: creature.weaknesses || "",
    status: {
      ...createBlankStatus(),
      ...creature.status,
    },
    attributes: {
      ...createBlankAttributes(),
      ...creature.attributes,
    },
    visibility: creature.visibility || "chronicler",
  };
}

function createBlankStatus(): CreatureStatus {
  return {
    health: { current: "", max: "" },
    stamina: { current: "", max: "" },
    mind: { current: "", max: "" },
    divinity: { current: "", max: "" },
  };
}

function createBlankAttributes(): CreatureAttributes {
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
